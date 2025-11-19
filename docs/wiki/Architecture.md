# Architecture

Technical architecture and design of pyArchInit Mobile PWA.

## 🎯 Design Principles

### 1. Offline-First
- All data operations work without internet
- Local IndexedDB storage as primary data source
- Background sync when connectivity restored
- Graceful degradation for online-only features

### 2. Progressive Enhancement
- Core functionality works on all devices
- Enhanced features for capable browsers
- PWA installation for native-like experience
- Responsive design for any screen size

### 3. Archaeological Domain Focus
- Optimized for stratigraphic units (US) recording
- Support for archaeological terminology and workflows
- Integration with PyArchInit ecosystem
- Specialized AI prompts for archaeological context

### 4. Separation of Concerns
- Backend: Data management, AI processing, database operations
- Frontend: User interface, offline storage, PWA features
- Clear API boundaries between layers
- Independent deployment of components

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Device                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PWA Frontend (React)                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Audio   │  │  Photo   │  │   3D Model      │  │   │
│  │  │ Recorder │  │ Capture  │  │   Viewer        │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │         IndexedDB (Offline Storage)        │    │   │
│  │  │  • audioNotes  • images  • syncQueue      │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │        Sync Service (Background)           │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend Server (FastAPI)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API Endpoints (REST)                    │   │
│  │  /api/media  /api/notes  /api/auth  /api/database  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐   │
│  │   Image      │  │  AI Processor │  │   Database   │   │
│  │  Processor   │  │  (Whisper +   │  │    Manager   │   │
│  │  (Pillow)    │  │   Claude)     │  │ (SQLAlchemy) │   │
│  └──────────────┘  └───────────────┘  └──────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         PostgreSQL / SQLite Database                        │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  sites   │  │    us    │  │    media    │  │  notes  │ │
│  │  _table  │  │  _table  │  │   _table    │  │ (mobile)│ │
│  └──────────┘  └──────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              External AI Services                           │
│  ┌───────────────────────┐  ┌──────────────────────────┐   │
│  │  OpenAI Whisper API   │  │  Anthropic Claude API    │   │
│  │  (Transcription)      │  │  (Data Extraction)       │   │
│  └───────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Frontend Architecture

### Technology Stack

- **React 18**: Component-based UI framework
- **Vite**: Fast build tool and dev server
- **IndexedDB (idb)**: Client-side database for offline storage
- **Three.js**: 3D model rendering
- **Web APIs**: MediaRecorder, getUserMedia, Service Worker

### Component Structure

```
frontend/src/
├── components/           # React components
│   ├── AudioRecorder.jsx       # Voice recording UI
│   ├── PhotoCapture.jsx        # Camera interface
│   ├── MediaGallery.jsx        # Photo gallery
│   ├── ModelViewer.jsx         # 3D model viewer
│   ├── NotePreview.jsx         # AI result validation
│   ├── RapportiEditor.jsx      # Relationship editor
│   └── TropyIntegration.jsx    # Tropy export/import
│
├── services/            # Business logic
│   ├── offlineStorage.js       # IndexedDB abstraction
│   ├── syncService.js          # Background sync
│   ├── audioService.js         # Audio processing
│   └── apiClient.js            # HTTP client
│
├── utils/               # Utility functions
│   ├── fileUtils.js            # File operations
│   ├── dateUtils.js            # Date formatting
│   └── validation.js           # Input validation
│
├── hooks/               # Custom React hooks
│   ├── useOfflineStorage.js    # IndexedDB hook
│   ├── useSync.js              # Sync status hook
│   └── useAuth.js              # Authentication hook
│
└── App.jsx              # Root component
```

### Offline Storage Schema

**IndexedDB Stores:**

```javascript
// audioNotes store
{
  id: 'uuid',
  filename: 'audio_timestamp.mp3',
  audioBlob: Blob,
  site: 'castello',
  area: '1',
  status: 'pending', // pending, processing, processed, synced
  transcription: { text: '...', language: 'it', confidence: 0.95 },
  extraction: { entity_type: 'US', fields: {...}, relationships: [...] },
  createdAt: Date,
  syncedAt: Date
}

// images store
{
  id: 'uuid',
  filename: 'image_timestamp.jpg',
  imageBlob: Blob,
  entityType: 'US',
  entityId: '2045',
  site: 'castello',
  area: '1',
  description: 'South section',
  tags: ['section', 'detail'],
  status: 'pending',
  createdAt: Date,
  syncedAt: Date
}

// syncQueue store
{
  id: 'uuid',
  type: 'audio_note' | 'image' | 'us_data',
  itemId: 'uuid',
  priority: 1-10,
  retryCount: 0,
  lastError: null,
  createdAt: Date
}

// settings store
{
  key: 'setting_name',
  value: any
}
```

### PWA Features

**Service Worker** (`frontend/public/sw.js`):
- Caches app shell for offline access
- Cache-first strategy for static assets
- Network-first for API calls
- Background sync for failed requests

**Web App Manifest** (`frontend/public/manifest.json`):
- App name, description, icons
- Start URL and display mode
- Theme colors
- Orientation preferences

### State Management

**Local Component State**:
- Used for UI state (modals, forms)
- React useState and useReducer

**Context API**:
- Auth context (user, token)
- Settings context (preferences)
- Sync context (queue status)

**IndexedDB**:
- Primary data store
- Persistent across sessions
- Survives app closure

---

## 🔧 Backend Architecture

### Technology Stack

- **Python 3.8+**: Programming language
- **FastAPI**: Modern web framework
- **SQLAlchemy**: ORM for database operations
- **Pillow**: Image processing
- **psycopg2**: PostgreSQL adapter
- **Pydantic**: Data validation

### Project Structure

```
backend/
├── main.py                     # FastAPI application entry point
│
├── config.py                   # Configuration and environment variables
│
├── models/                     # Database models
│   ├── database.py                 # PyArchInit schema models
│   └── auth.py                     # Authentication models
│
├── routes/                     # API endpoints
│   ├── auth.py                     # Authentication endpoints
│   ├── media.py                    # Media upload/download
│   ├── notes.py                    # Audio notes processing
│   ├── database.py                 # Database operations
│   └── tropy.py                    # Tropy integration
│
├── services/                   # Business logic
│   ├── image_processor.py          # Image resizing, EXIF
│   ├── ai_processor.py             # Whisper + Claude integration
│   ├── db_manager.py               # Database connection management
│   └── auth_service.py             # JWT, password hashing
│
├── middleware/                 # Request/response interceptors
│   ├── cors.py                     # CORS configuration
│   ├── auth.py                     # JWT validation
│   └── error_handler.py            # Error responses
│
├── migrations/                 # Database migrations
│   ├── 001_create_auth_tables.sql
│   └── 002_enable_row_level_security.sql
│
└── requirements.txt            # Python dependencies
```

### API Endpoint Design

**RESTful conventions:**
- `GET /api/resource` - List resources
- `GET /api/resource/{id}` - Get single resource
- `POST /api/resource` - Create resource
- `PUT /api/resource/{id}` - Update resource
- `DELETE /api/resource/{id}` - Delete resource

**Authentication:**
- JWT tokens in Authorization header
- Token expiry: 30 days (configurable)
- Refresh token support

**Response format:**
```json
{
  "data": {...},        // Successful response data
  "error": null,        // Or error message
  "meta": {             // Optional metadata
    "page": 1,
    "total": 100
  }
}
```

### Image Processing Pipeline

```
Upload → Validate → Process → Store → Database

1. Upload:
   - Receive multipart/form-data
   - Validate file type and size
   - Generate unique filename

2. Validate:
   - Check entity exists (US, site, etc.)
   - Verify user permissions
   - Validate metadata

3. Process:
   - Extract EXIF data (GPS, date, camera)
   - Create thumbnail (150x150)
   - Create resized (800x600)
   - Keep original

4. Store:
   - Save to filesystem:
     - {MEDIA_ROOT}/original/
     - {MEDIA_ROOT}/resize/
     - {MEDIA_ROOT}/thumb/

5. Database:
   - Insert media_table record
   - Link to entity (US, Tomb, Material)
   - Store all paths and metadata
```

### AI Processing Pipeline

```
Audio Upload → Transcription → Extraction → Validation → Database

1. Audio Upload:
   - Receive audio file (mp3, wav, etc.)
   - Validate format and size (<25MB)
   - Store temporarily

2. Transcription (Whisper):
   - Send to OpenAI Whisper API
   - Get text + language + confidence
   - Store in mobile_notes.transcription

3. Extraction (Claude):
   - Send transcription to Claude
   - Archaeological context prompt
   - Extract structured fields:
     * entity_type (US, TOMBA, MATERIALE)
     * fields (us, sito, area, descrizione, etc.)
     * relationships (copre, tagliato da, etc.)
     * confidence score

4. Validation:
   - Return to user for review
   - User can edit fields
   - User confirms or rejects

5. Database:
   - Insert into appropriate table:
     * us_table for stratigraphic units
     * tomba_table for tombs
     * inventario_materiale_table for materials
   - Store original audio path
   - Link transcription and extraction
```

### Database Connection Management

**Connection Pooling:**
```python
# SQLAlchemy engine with pool
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,          # Persistent connections
    max_overflow=10,       # Extra connections on demand
    pool_pre_ping=True,    # Verify connections before use
    pool_recycle=3600      # Recycle after 1 hour
)
```

**Multi-User Modes:**

1. **SQLite Mode**:
   - Single database file
   - No user isolation
   - Development only

2. **Separate Mode**:
   - One PostgreSQL database per user
   - Complete data isolation
   - Higher resource usage
   - Database naming: `pyarchinit_user_{user_id}`

3. **Hybrid Mode** (Recommended):
   - Single PostgreSQL database
   - Row-Level Security (RLS) for isolation
   - Project-based collaboration
   - Most efficient

---

## 🔄 Data Flow

### Recording Audio Note (Offline → Online)

```
1. User records audio
   ↓
2. AudioRecorder component
   - Captures audio via MediaRecorder API
   - Saves as Blob
   ↓
3. offlineStorage.saveAudioNote()
   - Store in IndexedDB.audioNotes
   - Add to IndexedDB.syncQueue
   - Status: 'pending'
   ↓
4. User offline → Wait for connection
   ↓
5. Connection detected
   ↓
6. syncService.syncAudioNote()
   - Upload audio file
   - POST /api/notes/upload-audio
   ↓
7. Backend receives file
   - Save temporarily
   - Return note_id
   ↓
8. syncService triggers processing
   - POST /api/notes/{note_id}/process
   ↓
9. Backend AI processing
   - Whisper transcription
   - Claude extraction
   ↓
10. Frontend polls for result
    - GET /api/notes/{note_id}
    - Update IndexedDB
    ↓
11. User validates result
    - Review in NotePreview component
    - Edit if needed
    - Confirm
    ↓
12. Save to database
    - POST /api/database/us
    - Update status: 'synced'
```

### Capturing Photo (Offline → Online)

```
1. User takes photo
   ↓
2. PhotoCapture component
   - Access camera via getUserMedia
   - Capture image as Blob
   ↓
3. offlineStorage.saveImage()
   - Store in IndexedDB.images
   - Add to syncQueue
   ↓
4. When online, syncService.syncImage()
   - Upload with metadata
   - POST /api/media/upload-image
   ↓
5. Backend processing
   - imageProcessor.process()
   - Create 3 versions
   - Extract EXIF
   - Save to filesystem
   - Insert to media_table
   ↓
6. Return media_id and URLs
   ↓
7. Update IndexedDB
   - Mark as synced
   - Store media_id
```

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User Registration/Login
   ↓
2. Backend validates credentials
   - Password hashed with bcrypt
   - Check against users table
   ↓
3. Generate JWT token
   - Payload: user_id, email, role
   - Sign with SECRET_KEY
   - Expiry: 30 days
   ↓
4. Return token to client
   ↓
5. Client stores in localStorage
   ↓
6. Subsequent requests include token
   - Authorization: Bearer {token}
   ↓
7. Backend validates token
   - Verify signature
   - Check expiry
   - Extract user info
   ↓
8. Execute request with user context
```

### Row-Level Security (Hybrid Mode)

```sql
-- Enable RLS on tables
ALTER TABLE us_table ENABLE ROW LEVEL SECURITY;

-- Policy: Users see only their project data
CREATE POLICY us_isolation_policy ON us_table
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = current_setting('app.current_user_id')::int
    )
  );

-- Set user context before queries
SET LOCAL app.current_user_id = 123;
```

### Input Validation

**Backend (Pydantic models)**:
```python
class CreateUS(BaseModel):
    sito: str = Field(..., min_length=1, max_length=100)
    area: str = Field(..., min_length=1, max_length=50)
    us: int = Field(..., gt=0)
    descrizione: Optional[str] = Field(None, max_length=1000)
    
    @validator('sito')
    def site_must_exist(cls, v):
        # Check site exists in database
        return v
```

**Frontend (validation functions)**:
```javascript
function validateUS(data) {
  if (!data.us || data.us <= 0) {
    throw new Error('US number must be positive');
  }
  if (!data.sito) {
    throw new Error('Site is required');
  }
  // ...
}
```

---

## ⚡ Performance Optimizations

### Frontend

**Code Splitting:**
- Lazy load routes with React.lazy()
- Dynamic imports for heavy components
- Separate bundles for vendor code

**Image Optimization:**
- Use thumbnail for galleries (150x150)
- Progressive loading (thumb → resize → original)
- Lazy load images below fold

**IndexedDB Optimization:**
- Indexed queries (by site, status, date)
- Pagination for large result sets
- Delete synced items periodically

**Service Worker Caching:**
- App shell cached on install
- API responses cached (24h TTL)
- Stale-while-revalidate for non-critical data

### Backend

**Database Indexing:**
```sql
-- Speed up common queries
CREATE INDEX idx_us_site ON us_table(sito);
CREATE INDEX idx_us_area ON us_table(area);
CREATE INDEX idx_media_entity ON media_table(entity_type, entity_id);
CREATE INDEX idx_notes_status ON mobile_notes(status);
```

**Connection Pooling:**
- Reuse database connections
- Avoid connection overhead
- Handle connection errors gracefully

**Async I/O:**
- FastAPI async/await support
- Non-blocking file operations
- Parallel AI API calls when possible

**Response Compression:**
- Gzip/Brotli compression enabled
- Reduces bandwidth usage
- Faster response times

---

## 🔄 Sync Architecture

### Queue Management

**Priority System:**
```
Priority 1 (Highest): Authentication, critical errors
Priority 2: Photo uploads
Priority 3: Audio note uploads
Priority 4: AI processing requests
Priority 5: Database updates
Priority 6 (Lowest): Analytics, logs
```

**Retry Logic:**
```
Attempt 1: Immediate
Attempt 2: 5 minutes later (exponential backoff)
Attempt 3: 15 minutes later
Attempt 4: Failed → User notification
```

**Conflict Resolution:**
```
1. Detect conflict (modified timestamp differs)
2. Show user both versions
3. User chooses:
   - Keep local
   - Keep remote
   - Merge (manual edit)
4. Apply resolution
5. Continue sync
```

### Background Sync

**Service Worker Background Sync API:**
```javascript
// Register sync
navigator.serviceWorker.ready.then(registration => {
  registration.sync.register('sync-data');
});

// Handle sync event
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncAllPendingItems());
  }
});
```

**Fallback (if Background Sync not available):**
- Poll every 5 minutes when online
- User-triggered manual sync
- Sync on app resume

---

## 📊 Monitoring & Logging

### Frontend Logging

**Console Levels:**
- `console.error()` - Errors
- `console.warn()` - Warnings
- `console.log()` - Info (dev only)
- `console.debug()` - Debug (dev only)

**Error Tracking:**
- Catch unhandled errors
- Log to backend error endpoint
- Include user context (if opted in)

### Backend Logging

**Log Levels:**
```python
import logging

logging.debug('Detailed debug info')
logging.info('General info')
logging.warning('Warning message')
logging.error('Error occurred')
logging.critical('Critical failure')
```

**Structured Logging:**
```json
{
  "timestamp": "2024-03-15T14:30:22Z",
  "level": "ERROR",
  "message": "Failed to process audio",
  "user_id": 123,
  "note_id": 456,
  "error": "OpenAI API timeout"
}
```

---

## 🧪 Testing Strategy

### Frontend Tests

**Unit Tests** (Jest + React Testing Library):
- Component rendering
- User interactions
- Utility functions
- Service functions

**Integration Tests**:
- Component interactions
- API mocking
- IndexedDB operations

**E2E Tests** (Playwright):
- Complete user workflows
- PWA installation
- Offline functionality

### Backend Tests

**Unit Tests** (pytest):
- Service functions
- Data validation
- Business logic

**Integration Tests**:
- API endpoints
- Database operations
- AI service mocking

**Load Tests** (Locust):
- Concurrent users
- Upload performance
- Database queries

---

## 📚 Related Documentation

- [[Development Guide]] - Contributing guide
- [[API Documentation]] - API reference
- [[Deployment]] - Production deployment
- [[Troubleshooting]] - Common issues
