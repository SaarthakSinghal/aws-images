import json, os, hashlib
from io import BytesIO
from datetime import datetime, timezone
from urllib.parse import unquote_plus
from PIL import Image

import boto3
from botocore.exceptions import ClientError

from decimal import Decimal

# --- AWS clients/resources ---
s3 = boto3.client("s3")
rek = boto3.client("rekognition")
ddb = boto3.resource("dynamodb")

# --- Env vars ---
PHOTOS_TABLE = os.environ.get("PHOTOS_TABLE", "Photos")
PERSONS_TABLE = os.environ.get("PERSONS_TABLE", "Persons")
OCCURRENCES_TABLE = os.environ.get("OCCURRENCES_TABLE", "Occurrences")

RAW_PREFIX = os.environ.get("RAW_PREFIX", "photos-raw/")

THUMBS_BUCKET = os.environ.get("THUMBS_BUCKET", "photo-clone-thumbs")
THUMBS_PREFIX = os.environ.get("THUMBS_PREFIX", "faces-thumbs/")

COLLECTION_ID = os.environ.get("REKOGNITION_COLLECTION_ID", "photo-clone-v2")
THRESHOLD = float(os.environ.get("FACE_MATCH_THRESHOLD", "95"))

photos_table = ddb.Table(PHOTOS_TABLE)
persons_table = ddb.Table(PERSONS_TABLE)
occurrences_table = ddb.Table(OCCURRENCES_TABLE)

def make_photo_id(bucket: str, key: str) -> str:
  """
    Deterministic id for idempotency: same bucket/key => same id.
  """
  raw = f"{bucket}/{key}".encode("utf-8")
  return hashlib.sha256(raw).hexdigest()[:20]

def clamp01(x: float) -> float:
  return max(0.0, min(1.0, x))

def bbox_to_pixels(bbox: dict, img_w: int, img_h: int) -> tuple[int, int, int, int]:
  """
    Rekognition BoundingBox , {}v
    x1, y1, x2, y2 = bbox_to_pixelsalues are ratios of overall image size and can be
    negative or > 1 at edges, so clamp.
  """
  left = clamp01(float(bbox.get("Left", 0.0)))
  top = clamp01(float(bbox.get("Top", 0.0)))
  width = float(bbox.get("Width", 0.0))
  height = float(bbox.get("Height", 0.0))

  right = clamp01(left + width)
  bottom = clamp01(top + height)

  x1 = int(left * img_w)
  y1 = int(top * img_h)
  x2 = int(right * img_w)
  y2 = int(bottom * img_h)

  # prevent empty crops
  x2 = max(x2, x1 + 1)
  y2 = max(y2, y1 + 1)
  return x1, y1, x2, y2

def as_decimal_bbox(bbox: dict) -> dict:
  """
    DynamoDB likes Decimal for numbers (boto3 converts floats poorly sometimes).
    We'll store bbox as a map of Decimals.
  """
  return {
      "Left": Decimal(str(bbox.get("Left", 0.0))),
      "Top": Decimal(str(bbox.get("Top", 0.0))),
      "Width": Decimal(str(bbox.get("Width", 0.0))),
      "Height": Decimal(str(bbox.get("Height", 0.0))),
  }

def upsert_person(person_id: str, rep_thumb_key: str, created_at: str):
  """
    Create the person if missing; increment photoCount by 1.
    Also set a representative thumbnail only if not already set
  """
  persons_table.update_item(
    Key={"personId": person_id},
    UpdateExpression=(
      "SET createdAt = if_not_exists(createdAt, :ca), "
      "repThumbKey = if_not_exists(repThumbKey, :rt) "
      "ADD photoCount :inc"
    ),
    ExpressionAttributeValues={
      ":ca": created_at,
      ":rt": rep_thumb_key,
      ":inc": Decimal(1)
    }
  )

def write_occurrences(
    person_id: str,
    photo_id: str,
    photo_bucket: str,
    photo_key: str,
    thumb_key: str,
    bbox: dict,
    confidence: float | None
):
  item = {
    "personId": person_id,
    "photoId": photo_id,
    "photo_bucket": photo_bucket,
    "photo_key": photo_key,
    "thumb_key": thumb_key,
    "boundingbox": as_decimal_bbox(bbox),
  }

  if confidence is not None:
    item["confidence"] = Decimal(str(confidence))

  occurrences_table.put_item(Item=item)

def lambda_handler(event, context):
  print("EVENT: ", json.dumps(event))

  records = event.get("Records", [])
  if not records:
    print("No Records found; nothing to do.")
    return {"statusCode": 200, "body": "no records"}

  for record in records:
    s3_info = record.get("s3", {})
    bucket = s3_info.get("bucket", {}).get("name")
    key = s3_info.get("object", {}).get("key")

    if not bucket or not key:
      print("Skipping record: missing bucket/key")
      continue

    key = unquote_plus(key)
    if not key.startswith(RAW_PREFIX):
      print(f"Skipping key not under RAW_PREFIX: {key}")
      continue

    photo_id = make_photo_id(bucket, key)
    uploaded_at = datetime.now(timezone.utc).isoformat()

    item = {
      "photoId": photo_id,
      "s3Bucket": bucket,
      "s3Key": key,
      "uploadedAt": uploaded_at,
    }

    try:
      photos_table.put_item(
        Item=item,
        ConditionExpression="attribute_not_exists(photoId)"
      )
      print(f"Photos: inserted photoId={photo_id} key={key}")
    except ClientError as e:
      code = e.response.get("Error", {}).get("Code", "Unknown")
      if code == "ConditionalCheckFailedException":
          print(f"Photos: already exists, skipping photoId={photo_id} key={key}")
          continue

      print("DynamoDB put_item failed: ", str(e))
      raise

    # Detect faces and update the image entry in
    # DynamoDB to have the face count
    detect_resp = rek.detect_faces(
      Image={"S3Object": {"Bucket": bucket, "Name": key}},
      Attributes=["DEFAULT"]
    )

    face_details = detect_resp.get("FaceDetails", [])
    face_count = len(face_details)
    print(f"DetectFaces: photoId={photo_id} faces={face_count}")

    # Store faceCount back into the respective Photos
    # row (UpdateExpression uses SET)
    photos_table.update_item(
      Key={"photoId": photo_id},
      UpdateExpression="SET faceCount = :c",
      ExpressionAttributeValues={":c": face_count}
    )

    if face_count == 0:
      continue

    # Crop the faces in the images and store in
    # seperate S3 bucket
    obj = s3.get_object(Bucket=bucket, Key=key)
    img_bytes = obj["Body"].read()

    im = Image.open(BytesIO(img_bytes)).convert("RGB")
    img_w, img_h = im.size
    thumb_keys = []
    assigned_person_ids = []

    for idx, fd in enumerate(face_details, start=1):
      bbox = fd.get("BoundingBox", {})
      confidence = fd.get("Confidence")

      x1, y1, x2, y2 = bbox_to_pixels(bbox, img_w, img_h)
      face_im = im.crop((x1, y1, x2, y2))

      out = BytesIO()
      face_im.save(out, format="JPEG", quality=90)
      out.seek(0)
      face_bytes = out.getvalue()

      # 1) Search in collection
      search_resp = rek.search_faces_by_image(
        CollectionId=COLLECTION_ID,
        Image={"Bytes": face_bytes},
        MaxFaces=1,
        FaceMatchThreshold=THRESHOLD
      )

      matches = search_resp.get("FaceMatches", [])
      if matches:
        top = matches[0]
        person_id = top["Face"]["FaceId"]
        similarity = top.get("Similarity")
        print(f"Match: idx={idx} personId(faceId)={person_id} similarity={similarity}")
      else:
        # 2) If no match --> index face into the collection
        print(f"No Match: idx={idx} threshold={THRESHOLD} --> Indexing Face...")

        index_resp = rek.index_faces(
          CollectionId=COLLECTION_ID,
          Image={"Bytes": face_bytes},
          ExternalImageId=f"{photo_id}_face_{idx}",
          MaxFaces=1,
          DetectionAttributes=["DEFAULT"]
        )

        face_records = index_resp.get("FaceRecords", [])
        if face_records:
          person_id = face_records[0]["Face"]["FaceId"]
          print(f"Indexed: idx={idx} new personId(faceId)={person_id}")
        else:
          # If indexing fails, Rekognition returns UnindexedFaces with reasons
          # (e.g., too blurry, too small, extreme pose).
          unindexed = index_resp.get("UnindexedFaces", [])
          print(f"IndexFailed: idx={idx} unindexed={unindexed}")

      # Change the structure to
      # person_id --> [photo_id1_face1, photo_id2_face_2,...]
      thumb_key = f"{THUMBS_PREFIX}{person_id}/{photo_id}_face_{idx}.jpg"

      #Upload thumbnail to S3 bucket
      s3.put_object(
        Bucket=THUMBS_BUCKET,
        Key=thumb_key,
        Body=face_bytes,
        ContentType="image/jpeg"
      )
      thumb_keys.append(thumb_key)

      # Write to Persons and Occurrences Table
      # - increment photoCount (for "most frequent" People grid)
      # - set repThumbKey once
      upsert_person(person_id=person_id, rep_thumb_key=thumb_key, created_at=uploaded_at)
      print(f"Written to Persons table for person_id={person_id}")

      write_occurrences(
        person_id=person_id,
        photo_id=photo_id,
        photo_bucket=bucket,
        photo_key=key,
        thumb_key=thumb_key,
        bbox=bbox,
        confidence=confidence,
      )
      print(f"Written to Occurrences table for person_id={person_id}")

    print(f"Wrote Persons and Occurences table for {len(thumb_keys)} faces, photoId={photo_id}")
    print(f"Thumbnails: uploaded {len(thumb_keys)} for s3Key={key}/")

  return {"statusCode": 200, "body": "phase11 ok"}
