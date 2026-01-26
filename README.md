<h1 align="center">Beetroot - People Clustering</h1>

<p align="center">
  <img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white">
  <img src="https://img.shields.io/badge/shadcn/ui-%23000000?style=for-the-badge&logo=shadcnui&logoColor=white">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/aws-s3-grey?style=for-the-badge&color=2F771B">
  <img src="https://img.shields.io/badge/aws-dynamo_db-grey?style=for-the-badge&color=3C49CC">
  <img src="https://img.shields.io/badge/aws-rekognition-grey?style=for-the-badge&color=1E7A66">
</p>

A React-based web application for analyzing and clustering faces from photo collections using AWS Rekognition.

## Technologies

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React 18** - UI library
- **shadcn/ui** - High-quality React components
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Lucide React** - Beautiful icons

## Features

- View clustered faces from your photo collection
- Search and filter people by ID
- Sort by photo count
- Responsive design with dark mode support
- Client-side caching for improved performance
- Photo lightbox for viewing details

## Getting Started

### Prerequisites

- Node.js & npm installed

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Setup

### Prerequisites

- AWS account + AWS CLI configured (`us-east-1`)
- Node.js + npm
- Python 3.12

### 1) AWS storages(S3 buckets + Rekognition collection + DynamoDB tables)

**AWS Rekognition collection**

```bash
aws rekognition create-collection --collection-id beetroot --region us-east-1
```

**S3 buckets**

```bash
aws s3 mb s3://beetroot-raw --region us-east-1
aws s3 mb s3://beetroot-thumbs --region us-east-1
```

**DynamoDB tables**

Create these tables (default names used by Lambdas):

- `Photos` (PK: `photoId` string)
- `Persons` (PK: `personId` string)
- `Occurrences` (PK: `personId` string, SK: `photoId` string)

### 2) Deploy backend (2 Lambdas + HTTP API)

1. **Ingest Lambda** (S3 → Rekognition → DynamoDB + thumbs)

Use: `backend/beetroot-ingest.py`

Set env vars:

- `PHOTOS_TABLE=Photos`
- `PERSONS_TABLE=Persons`
- `OCCURRENCES_TABLE=Occurrences`
- `RAW_PREFIX=photos-raw/`
- `THUMBS_BUCKET=beetroot-thumbs`
- `THUMBS_PREFIX=faces-thumbs/`
- `REKOGNITION_COLLECTION_ID=beetroot`
- `FACE_MATCH_THRESHOLD=95`

Add an S3 trigger on bucket `beetroot-raw`:

- event: `ObjectCreated:*`
- prefix: `photos-raw/`

2. **API Lambda** (HTTP API → DynamoDB + presigned URLs)

Use: `backend/beetroot-api.py`

Set env vars:

- `THUMBS_BUCKET=beetroot-thumbs`
- `PRESIGN_EXPIRES=3600`
- `PHOTOS_TABLE=Photos`
- `PERSONS_TABLE=Persons`
- `OCCURRENCES_TABLE=Occurrences`

Create an **API Gateway HTTP API** with routes:

- `GET /persons`
- `GET /persons/{personId}/photos`

Enable CORS for your frontend origin.

### 3) Run frontend (Vite React)

```bash
cd frontend
cp .env.example .env
```

Set in `frontend/.env`:

```env
VITE_API_BASE_URL=https://<your-http-api-invoke-url>
```

Install + run:

```bash
npm install
npm run dev
```

### 4) Quick test

Upload a photo to trigger processing:

```bash
aws s3 cp ./some.jpg s3://beetroot-raw/photos-raw/ --region us-east-1
```

Then open the frontend:

- Click **Load People**
- Click a person → **Load Images**
