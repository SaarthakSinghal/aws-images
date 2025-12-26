import os, json

import boto3

from decimal import Decimal
from boto3.dynamodb.conditions import Key

# --- AWS clients/resources ---
s3 = boto3.client("s3")
ddb = boto3.resource("dynamodb")

# --- Env vars ---
THUMBS_BUCKET = os.environ.get("THUMBS_BUCKET", "photo-clone-thumbs")
PRESIGN_EXPIRES = int(os.environ.get("PRESIGN_EXPIRES", 3600))

# --- DynamoDB tables ---
photos_table = ddb.Table(os.environ.get("PHOTOS_TABLE", "Photos"))
persons_table = ddb.Table(os.environ.get("PERSONS_TABLE", "Persons"))
occurrences_table = ddb.Table(os.environ.get("OCCURRENCES_TABLE", "Occurrences"))

def presign_get_object(bucket: str, key: str) -> str:
  return s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": bucket, "Key": key},
    ExpiresIn=PRESIGN_EXPIRES
  )

def _json_default(o):
  """
  DynamoDB uses Decimal for numbers; json.dumps() can't serialize Decimal by default
  """
  if isinstance(o, Decimal):
    if o % 1 == 0:
      return int(o)
    return float(o)

  raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")

def _resp(status: int, body: dict):
  return {
    "statusCode": status,
    "headers": {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    "body": json.dumps(body, default=_json_default)
  }

def lambda_handler(event, context):
  method = (
    event.get("requestContext", {}).get("http", {}).get("method")
    or event.get("httpMethod")
  )
  path = event.get("rawPath") or event.get("path") or ""

  # Preflight
  if method == "OPTIONS":
    """
      Browsers often send an OPTIONS request before the real GET
      If we don't answer OPTIONS properly -> your React call fails even though GET is correct.
    """
    return _resp(200, {"ok": True})

  # Route 1: GET /persons
  if method == "GET" and path == "/persons":
    items = []
    resp = persons_table.scan(Limit=200)
    items.extend(resp.get("Items", []))

    # Pagination loop
    """
      LeastEvaluatedKey is the key from where the next page starts
      If it exists in response, means there are still results left
    """
    while "LeastEvaluatedKey" in resp and len(items) < 200:
      resp = persons_table.scan(
        ExclusiveStartKey=resp["LastEvaluatedKey"],
        Limit=200
      )
      items.extend(resp.get("Items", []))

    items.sort(key=lambda x: int(x.get("photoCount", 0)), reverse=True)
    print(f"Items: {items}")

    # Presign URL for the represntative thumbnail
    # repThumbKey is the representative thumbnail key value
    out = []
    for p in items[:100]:
      rep_key = p.get("repThumbKey")
      rep_url = presign_get_object(THUMBS_BUCKET, rep_key) if rep_key else None
      out.append({
        "personId": p.get("personId"),
        "photoCount": p.get("photoCount", 0),
        "repThumbKey": rep_key,
        "repThumbURL": rep_url
      })

    return _resp(200, {"persons": out})

  # Route 2: GET /persons/{personId}/photos
  if method == "GET" and path.startswith("/persons/") and path.endswith("/photos"):
    parts = path.strip("/").split("/")
    if len(parts) != 3:
      return _resp(400, {"error": "bad path"})
    person_id = parts[1]

    # Fetch all the occurrences for a person
    occ = occurrences_table.query(
      KeyConditionExpression=Key("personId").eq(person_id),
      Limit=200
    ).get("Items", [])

    # For all the occurrences, find their S3 location from Occurrences table
    photos = []
    for o in occ:
      photo_id = o.get("photoId")
      if not photo_id:
        continue

      photo_bucket = o.get("photo_bucket") or o.get("photoBucket")
      photo_key = o.get("photo_key") or o.get("photoKey")
      thumb_key = o.get("thumb_key") or o.get("thumbKey")

      if not photo_bucket or not photo_key:
        p = photos_table.get_item(Key={"photoId": photo_id}).get("Item")
        if not p:
          continue
        photo_bucket = photo_bucket or p.get("s3Bucket")
        photos_key = photo_key or p.get("s3Key")

      photo_url = presign_get_object(bucket=photo_bucket, key=photo_key) if (photo_bucket and photo_key) else None
      photos.append({
        "photoId": photo_id,
        "photoBucket": photo_bucket,
        "photoKey": photo_key,
        "thumbKey": thumb_key,
        "photoURL": photo_url
      })

    return _resp(200, {"personId": person_id, "photos": photos})

  return _resp(404, {"error": "not found", "path": path})
