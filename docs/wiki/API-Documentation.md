# API Documentation

Complete reference for the pyArchInit Mobile PWA backend API.

## 🌐 Base URL

**Development**: `http://localhost:8000`  
**Production**: `https://your-domain.com`

## 🔑 Authentication

Most endpoints require authentication using JWT tokens.

### Get Access Token

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "archaeologist"
  }
}
```

### Using the Token

Include the token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Example with curl:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/sites
```

## 📌 Endpoints

### Health Check

#### `GET /health`

Check if the API is running.

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

## 👤 Authentication Endpoints

### Register User

#### `POST /api/auth/register`

Create a new user account.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "role": "archaeologist"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "name": "John Doe",
    "role": "archaeologist"
  }
}
```

### Get Current User

#### `GET /api/auth/me`

Get information about the currently authenticated user.

**Authentication**: Required

**Response**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "role": "archaeologist",
  "created_at": "2024-03-15T10:30:00Z"
}
```

### Get Database Mode

#### `GET /api/auth/db-mode`

Get information about the database mode configuration.

**Authentication**: Not required

**Response**:
```json
{
  "mode": "hybrid",
  "description": "Single PostgreSQL with Row-Level Security (collaborative)"
}
```

---

## 🏛️ Sites Endpoints

### List Sites

#### `GET /api/sites`

Get list of all archaeological sites.

**Authentication**: Required

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)

**Response**:
```json
[
  {
    "id": 1,
    "sito": "castello",
    "descrizione": "Medieval Castle",
    "nazione": "Italy",
    "regione": "Lazio",
    "comune": "Roma"
  },
  {
    "id": 2,
    "sito": "test2",
    "descrizione": "Test Site 2",
    "nazione": "Italy",
    "regione": "Toscana",
    "comune": "Firenze"
  }
]
```

### Get Site Details

#### `GET /api/sites/{site_name}`

Get detailed information about a specific site.

**Authentication**: Required

**Path Parameters**:
- `site_name`: Name of the site

**Response**:
```json
{
  "id": 1,
  "sito": "castello",
  "descrizione": "Medieval Castle",
  "nazione": "Italy",
  "regione": "Lazio",
  "comune": "Roma",
  "indirizzo": "Via Roma 1",
  "us_count": 245,
  "media_count": 1023
}
```

---

## 📝 Audio Notes Endpoints

### Upload Audio File

#### `POST /api/notes/upload-audio`

Upload an audio recording for processing.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: Audio file (mp3, wav, m4a, ogg, webm)
- `site` (optional): Site name
- `area` (optional): Area identifier
- `us` (optional): US number

**Response**:
```json
{
  "note_id": 123,
  "filename": "audio_20240315_143022.mp3",
  "size": 2458624,
  "status": "uploaded",
  "created_at": "2024-03-15T14:30:22Z"
}
```

### Process Audio Note

#### `POST /api/notes/{note_id}/process`

Trigger AI processing (transcription + extraction) for an audio note.

**Authentication**: Required

**Path Parameters**:
- `note_id`: ID of the audio note

**Request Body**:
```json
{
  "language": "it"
}
```

**Response**:
```json
{
  "note_id": 123,
  "status": "processing",
  "estimated_time": 30
}
```

### Get Note Details

#### `GET /api/notes/{note_id}`

Get details of a specific audio note including transcription and extraction.

**Authentication**: Required

**Path Parameters**:
- `note_id`: ID of the audio note

**Response**:
```json
{
  "id": 123,
  "filename": "audio_20240315_143022.mp3",
  "status": "processed",
  "transcription": {
    "text": "US 2045, area 1, site castello, brown clay layer...",
    "language": "it",
    "confidence": 0.95
  },
  "extraction": {
    "entity_type": "US",
    "fields": {
      "us": 2045,
      "area": "1",
      "sito": "castello",
      "descrizione": "Brown clay layer",
      "colore": "Brown",
      "d_stratigrafica": "Strato"
    },
    "relationships": [
      ["Copre", "2046", "1", "castello"]
    ],
    "confidence": 0.92
  },
  "created_at": "2024-03-15T14:30:22Z",
  "processed_at": "2024-03-15T14:31:15Z"
}
```

### List Audio Notes

#### `GET /api/notes`

List all audio notes for the current user.

**Authentication**: Required

**Query Parameters**:
- `site` (optional): Filter by site
- `status` (optional): Filter by status (uploaded, processing, processed, error)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "items": [
    {
      "id": 123,
      "filename": "audio_20240315_143022.mp3",
      "status": "processed",
      "site": "castello",
      "created_at": "2024-03-15T14:30:22Z"
    }
  ],
  "total": 45,
  "page": 1,
  "pages": 5
}
```

---

## 📷 Media Endpoints

### Upload Image

#### `POST /api/media/upload-image`

Upload a photo with metadata.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: Image file (jpg, png, tiff)
- `entity_type`: Type of entity (US, TOMBA, MATERIALE)
- `entity_id`: Entity identifier
- `site`: Site name
- `area` (optional): Area identifier
- `description` (optional): Image description
- `tags` (optional): Comma-separated tags

**Response**:
```json
{
  "media_id": 456,
  "filename": "castello_US_2045_20240315_143530.jpg",
  "entity_type": "US",
  "entity_id": "2045",
  "site": "castello",
  "versions": {
    "original": "/api/media/file/456/original",
    "resize": "/api/media/file/456/resize",
    "thumb": "/api/media/file/456/thumb"
  },
  "exif": {
    "gps": {
      "latitude": 41.9028,
      "longitude": 12.4964
    },
    "date_time": "2024-03-15T14:35:30Z",
    "camera_model": "iPhone 13 Pro",
    "width": 4032,
    "height": 3024
  },
  "created_at": "2024-03-15T14:35:35Z"
}
```

### Get Image File

#### `GET /api/media/file/{media_id}/{size}`

Retrieve an image file.

**Authentication**: Required

**Path Parameters**:
- `media_id`: ID of the media record
- `size`: Image size (original, resize, thumb)

**Response**: Image file (image/jpeg or image/png)

### List Media

#### `GET /api/media`

List all media files.

**Authentication**: Required

**Query Parameters**:
- `site` (optional): Filter by site
- `entity_type` (optional): Filter by entity type
- `entity_id` (optional): Filter by entity ID
- `tags` (optional): Filter by tags (comma-separated)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "items": [
    {
      "id": 456,
      "filename": "castello_US_2045_20240315_143530.jpg",
      "entity_type": "US",
      "entity_id": "2045",
      "site": "castello",
      "description": "South section",
      "tags": ["section", "detail"],
      "thumb_url": "/api/media/file/456/thumb",
      "created_at": "2024-03-15T14:35:35Z"
    }
  ],
  "total": 1023,
  "page": 1,
  "pages": 103
}
```

### Update Media Metadata

#### `PUT /api/media/{media_id}`

Update metadata for an existing media file.

**Authentication**: Required

**Path Parameters**:
- `media_id`: ID of the media record

**Request Body**:
```json
{
  "description": "Updated description",
  "tags": ["new-tag", "updated"],
  "entity_type": "US",
  "entity_id": "2046"
}
```

**Response**:
```json
{
  "id": 456,
  "updated": true,
  "message": "Media metadata updated successfully"
}
```

### Delete Media

#### `DELETE /api/media/{media_id}`

Delete a media file and all its versions.

**Authentication**: Required (Admin or Owner only)

**Path Parameters**:
- `media_id`: ID of the media record

**Response**:
```json
{
  "deleted": true,
  "message": "Media deleted successfully"
}
```

---

## 🎨 3D Model Endpoints

### Upload 3D Model

#### `POST /api/models/upload`

Upload a 3D model file.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: 3D model file (glb, gltf, usdz)
- `name`: Model name
- `description` (optional): Model description
- `entity_type` (optional): Related entity type
- `entity_id` (optional): Related entity ID
- `site` (optional): Related site

**Response**:
```json
{
  "model_id": 789,
  "filename": "us2045_3d_model.glb",
  "name": "US 2045 3D Scan",
  "size": 15728640,
  "format": "glb",
  "url": "/api/models/file/789",
  "created_at": "2024-03-15T15:00:00Z"
}
```

### Get 3D Model File

#### `GET /api/models/file/{model_id}`

Download a 3D model file.

**Authentication**: Required

**Path Parameters**:
- `model_id`: ID of the model

**Response**: 3D model file

### List 3D Models

#### `GET /api/models`

List all 3D models.

**Authentication**: Required

**Query Parameters**:
- `site` (optional): Filter by site
- `format` (optional): Filter by format (glb, gltf, usdz)

**Response**:
```json
[
  {
    "id": 789,
    "filename": "us2045_3d_model.glb",
    "name": "US 2045 3D Scan",
    "format": "glb",
    "size": 15728640,
    "url": "/api/models/file/789",
    "created_at": "2024-03-15T15:00:00Z"
  }
]
```

---

## 📚 Tropy Integration Endpoints

### Export to Tropy

#### `GET /api/tropy/export`

Export media to Tropy JSON format.

**Authentication**: Required

**Query Parameters**:
- `site` (optional): Filter by site
- `start_date` (optional): Filter by start date (ISO 8601)
- `end_date` (optional): Filter by end date (ISO 8601)

**Response**: JSON file download

```json
{
  "@context": "https://tropy.org/v1/contexts/template.jsonld",
  "@type": "Project",
  "items": [
    {
      "template": "https://tropy.org/v1/templates/photo",
      "photo": "castello_US_2045_20240315_143530.jpg",
      "title": "US 2045",
      "date": "2024-03-15",
      "description": "South section"
    }
  ]
}
```

### Import from Tropy

#### `POST /api/tropy/import`

Import annotated data from Tropy JSON.

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: Tropy JSON file

**Response**:
```json
{
  "imported": 25,
  "updated": 25,
  "errors": 0,
  "message": "Tropy data imported successfully"
}
```

---

## 🔄 Sync Endpoints

### Get Sync Status

#### `GET /api/sync/status`

Get synchronization status for the current user.

**Authentication**: Required

**Response**:
```json
{
  "pending_items": 5,
  "last_sync": "2024-03-15T15:30:00Z",
  "items": [
    {
      "type": "audio_note",
      "id": 123,
      "status": "pending",
      "created_at": "2024-03-15T14:30:22Z"
    },
    {
      "type": "image",
      "id": 456,
      "status": "synced",
      "synced_at": "2024-03-15T15:30:00Z"
    }
  ]
}
```

### Trigger Manual Sync

#### `POST /api/sync/trigger`

Manually trigger synchronization.

**Authentication**: Required

**Response**:
```json
{
  "status": "started",
  "message": "Synchronization started",
  "estimated_time": 120
}
```

---

## 📊 Database Endpoints

### Get Stratigraphic Units

#### `GET /api/database/us`

List stratigraphic units (US).

**Authentication**: Required

**Query Parameters**:
- `site` (optional): Filter by site
- `area` (optional): Filter by area
- `us` (optional): Filter by US number
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**:
```json
{
  "items": [
    {
      "id": 1,
      "sito": "castello",
      "area": "1",
      "us": 2045,
      "d_stratigrafica": "Strato",
      "descrizione": "Brown clay layer",
      "interpretazione": "Artificial fill",
      "periodo_iniziale": "Medieval",
      "fase_iniziale": "13th century"
    }
  ],
  "total": 245,
  "page": 1,
  "pages": 25
}
```

### Create Stratigraphic Unit

#### `POST /api/database/us`

Create a new stratigraphic unit.

**Authentication**: Required

**Request Body**:
```json
{
  "sito": "castello",
  "area": "1",
  "us": 2047,
  "d_stratigrafica": "Strato",
  "descrizione": "Gray sandy layer",
  "interpretazione": "Natural deposit",
  "colore": "Gray",
  "inclusi": [["Pottery"], ["Bone fragments"]],
  "campioni": [["Sample 1", "Charcoal"]],
  "rapporti": [["Copre", "2048", "1", "castello"]]
}
```

**Response**:
```json
{
  "id": 246,
  "us": 2047,
  "created": true,
  "message": "Stratigraphic unit created successfully"
}
```

---

## ❌ Error Responses

All endpoints may return error responses in the following format:

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters",
  "errors": {
    "us": "US number is required",
    "site": "Site does not exist"
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## 🔧 Rate Limiting

API requests are rate-limited to prevent abuse:

- **Anonymous users**: 100 requests per hour
- **Authenticated users**: 1000 requests per hour
- **Admin users**: 5000 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1710513600
```

---

## 📝 API Versioning

The API uses URL versioning. Current version: **v1**

All endpoints are prefixed with `/api/` which corresponds to v1.

Future versions will use `/api/v2/`, `/api/v3/`, etc.

---

## 🧪 Testing the API

### Using curl

```bash
# Get access token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}' \
  | jq -r '.access_token')

# List sites
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/sites

# Upload image
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@photo.jpg" \
  -F "entity_type=US" \
  -F "entity_id=2045" \
  -F "site=castello" \
  http://localhost:8000/api/media/upload-image
```

### Using Python

```python
import requests

# Login
response = requests.post('http://localhost:8000/api/auth/login', json={
    'email': 'user@test.com',
    'password': 'password123'
})
token = response.json()['access_token']

# Headers for authenticated requests
headers = {'Authorization': f'Bearer {token}'}

# List sites
sites = requests.get('http://localhost:8000/api/sites', headers=headers)
print(sites.json())

# Upload image
files = {'file': open('photo.jpg', 'rb')}
data = {
    'entity_type': 'US',
    'entity_id': '2045',
    'site': 'castello'
}
media = requests.post(
    'http://localhost:8000/api/media/upload-image',
    headers=headers,
    files=files,
    data=data
)
print(media.json())
```

### Using JavaScript/Fetch

```javascript
// Login
const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@test.com',
    password: 'password123'
  })
});
const { access_token } = await loginResponse.json();

// List sites
const sitesResponse = await fetch('http://localhost:8000/api/sites', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
const sites = await sitesResponse.json();
console.log(sites);

// Upload image
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('entity_type', 'US');
formData.append('entity_id', '2045');
formData.append('site', 'castello');

const mediaResponse = await fetch('http://localhost:8000/api/media/upload-image', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${access_token}` },
  body: formData
});
const media = await mediaResponse.json();
console.log(media);
```

---

## 📖 Interactive API Documentation

The backend provides interactive API documentation using Swagger UI:

**URL**: `http://localhost:8000/docs`

Features:
- Browse all endpoints
- Test endpoints directly in browser
- View request/response schemas
- Generate code examples

---

## 🔗 Additional Resources

- [[Architecture]] - System architecture details
- [[Development Guide]] - Contributing to the project
- [[User Guide]] - End-user documentation
- [[Troubleshooting]] - Common issues and solutions
