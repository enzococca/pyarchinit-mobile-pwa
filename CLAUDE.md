# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pyArchInit Mobile PWA is an offline-first Progressive Web Application for archaeological field documentation. It integrates AI-powered audio transcription (OpenAI Whisper) and intelligent data extraction (Anthropic Claude) to structure archaeological data for the pyArchInit QGIS plugin ecosystem.

**Key Architecture**: Dual-database system with FastAPI backend, React frontend, and IndexedDB for offline functionality.

## Development Commands

### Backend (FastAPI)

```bash
# Start development server (from project root)
cd backend
source venv/bin/activate  # or: source ../.venv/bin/activate
python main.py

# Backend runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

### Frontend (React + Vite)

```bash
# Start development server
cd frontend
npm run dev
# Frontend runs on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing on Mobile Devices

```bash
# Backend - allow external connections
cd backend
python main.py --host 0.0.0.0

# Frontend - allow external connections
cd frontend
npm run dev -- --host
# Access from mobile: http://<your-ip>:5173
```

### Database Operations

```bash
# Create admin user (from backend/)
python create_admin.py

# Initialize auth tables
python init_auth_tables.py

# Run migrations (PostgreSQL)
psql -h localhost -U postgres -d pyarchinit_db -f migrations/001_create_auth_tables.sql

# Test database endpoints
./test_database_endpoints.sh
```

### Deployment

```bash
# Deploy frontend to Vercel
cd frontend
vercel --prod

# Trigger Railway redeploy (backend)
touch backend/.railway-rebuild && git add . && git commit -m "Trigger Railway redeploy" && git push
```

## Architecture

### Dual Database System

The application uses **two separate databases**:

1. **Auth Database** (`auth.db` - SQLite)
   - Always SQLite, regardless of DB_MODE
   - Stores: users, user_databases (connection mappings), sessions
   - Located: `/data/auth.db` (Railway) or `./auth.db` (local)

2. **PyArchInit Database** (SQLite or PostgreSQL)
   - Archaeological data storage
   - Three modes available via `DB_MODE` in `.env`:
     - `"separate"`: Each user has own PostgreSQL database (e.g., `pyarchinit_user_1`)
     - `"hybrid"`: Single PostgreSQL with Row-Level Security for multi-user
     - `"sqlite"`: Local SQLite at `/tmp/pyarchinit_db.sqlite`

### Database Mode Selection

Configure in `.env`:
```bash
DB_MODE=hybrid  # or "separate" or "sqlite"
```

**When to use each mode:**
- `separate`: Maximum data isolation, single-user projects, no collaboration needed
- `hybrid`: Multi-user collaboration, cost-effective, shared PostgreSQL
- `sqlite`: Local development, testing, offline-first mobile usage

### Data Flow

```
Mobile Device → React PWA → IndexedDB (offline storage)
                    ↓ (when online)
              FastAPI Backend
                    ↓
    ┌───────────────┴───────────────┐
    │                               │
Auth DB (SQLite)          PyArchInit DB (SQLite/PostgreSQL)
Users & Sessions          Archaeological Data
```

### AI Processing Pipeline

Audio notes go through a multi-stage pipeline:

1. **Audio Recording** (`AudioRecorder.jsx`)
   - Web Audio API captures audio
   - Stored in IndexedDB with metadata

2. **Transcription** (`ai_processor.py:AudioTranscriber`)
   - OpenAI Whisper API transcribes audio
   - Automatic language detection (99+ languages)
   - Returns text, language code, duration

3. **Interpretation** (`ai_processor.py:ArchaeologicalAIInterpreter`)
   - Claude AI analyzes transcription
   - Extracts structured fields matching PyArchInit schema
   - Identifies entity type (US, TOMBA, MATERIALE)
   - Parses stratigraphic relationships as list-of-lists format

4. **Validation** (`NotePreview.jsx`)
   - User reviews extracted data
   - Manual editing of fields
   - Relationship editor (`RapportiEditor.jsx`)

5. **Storage** (`routes/notes.py`)
   - Duplicate detection
   - Insert into PyArchInit database
   - Update mobile_notes table with approval status

### Key Backend Services

- **`services/db_manager.py`**: Multi-mode database connection manager with engine caching
- **`services/auth_service.py`**: JWT authentication, bcrypt password hashing, user management
- **`services/ai_processor.py`**: Whisper transcription + Claude interpretation
- **`services/image_processor.py`**: Image resizing (thumb 150x150, resize 800x600, original) + EXIF extraction
- **`services/stratigraphic_utils.py`**: List-of-lists parser for relationships (e.g., `[["Copre", "2046", "1", "test2"]]`)

### Key Frontend Components

- **`components/AudioRecorder.jsx`**: Voice recording with pause/resume, waveform visualization
- **`components/NotePreview.jsx`**: AI interpretation display, field editing, duplicate handling
- **`components/RapportiEditor.jsx`**: Stratigraphic relationships editor (list-of-lists format)
- **`components/PhotoCapture.jsx`**: Camera/gallery access, EXIF extraction, entity tagging
- **`components/MediaGallery.jsx`**: Photo gallery with filtering, 3D model integration
- **`components/ModelViewer.jsx`**: Three.js 3D viewer with OrbitControls
- **`services/offlineStorage.js`**: IndexedDB wrapper for offline-first architecture
- **`services/syncService.js`**: Background sync queue processor

### List-of-Lists Format

PyArchInit uses a specific **list-of-lists** format for relationships and nested data:

```javascript
// Relationships (rapporti field)
[
  ["Copre", "2046", "1", "test2"],      // [Type, US, Area, Site]
  ["Si lega a", "2047", "1", "test2"]
]

// Inclusions (inclusi field)
[
  ["Tiles"],
  ["Pottery", "Terra sigillata"],
  ["Bones"]
]

// Samples (campioni field)
[
  ["C14", "Sample001"],
  ["Charcoal", "Sample002"]
]
```

**Important**: Always maintain this format when editing relationships programmatically.

## Database Schema

### PyArchInit Tables (in models/database.py)

- **`site_table`**: Archaeological sites (sito, location, coordinates)
- **`us_table`**: Stratigraphic units (134 columns total, includes rapporti, inclusi, campioni as TEXT)
- **`media_table`**: Photos with entity associations (entity_type, entity_id)
- **`mobile_notes`**: Audio notes with transcription and AI interpretation (JSON fields)
- **`model_3d`**: 3D models with file paths and metadata

### Auth Tables (in models/auth.py)

- **`users`**: User accounts (email, password_hash, role, name)
- **`user_databases`**: Maps users to their PyArchInit databases (separate mode only)
- **`projects`**: Projects with owner (hybrid mode only)
- **`project_collaborators`**: Project team members (hybrid mode only)

## API Routes

All routes are in `backend/routes/`:

- **`/api/auth/*`** (`auth.py`): register, login, get current user, db-mode
- **`/api/media/*`** (`media.py`): upload, download, list, delete media
- **`/api/notes/*`** (`notes.py`): process audio, confirm note, list notes, approve/reject
- **`/api/database/*`** (`database.py`): list sites, create US, get US details
- **`/api/tropy/*`** (`tropy.py`): export/import Tropy JSON format
- **`/api/annotations/*`** (`annotations.py`): image annotation CRUD
- **`/api/projects/*`** (`projects.py`): project management, collaborators
- **`/api/migrations/*`** (`migrations.py`): database migration endpoint

## Environment Configuration

Copy `.env.example` to `.env` and configure:

**Required API Keys:**
- `OPENAI_API_KEY`: For Whisper transcription (get from platform.openai.com)
- `ANTHROPIC_API_KEY`: For Claude interpretation (get from console.anthropic.com)

**Database:**
- `DB_MODE`: "separate" | "hybrid" | "sqlite"
- PostgreSQL credentials (if not using SQLite)

**Security:**
- `SECRET_KEY`: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
- `CORS_ORIGINS`: Comma-separated list of allowed origins

## Working with Authentication

The auth system uses **JWT tokens** stored in localStorage:

```javascript
// Login flow (Login.jsx)
const response = await axios.post('/api/auth/login', { email, password });
localStorage.setItem('token', response.data.access_token);
localStorage.setItem('user', JSON.stringify(response.data.user));

// Protected requests
const token = localStorage.getItem('token');
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

**Backend dependency injection** (`dependencies.py`):
```python
from backend.services.auth_service import get_current_user
from backend.models.auth import User

@app.get("/protected")
async def protected_route(user: User = Depends(get_current_user)):
    # user.id, user.email, user.role available
    pass
```

## Media Storage Paths

Media files are organized in three versions (PyArchInit-compatible):

```
PYARCHINIT_MEDIA_ROOT/
├── original/     # Full-size originals
├── thumb/        # 150x150 thumbnails
├── resize/       # 800x600 web versions
└── 3d_models/
    ├── original/ # Uploaded models (OBJ, GLTF, GLB)
    ├── web/      # Optimized GLB for Three.js
    ├── ar/       # USDZ for iOS AR Quick Look
    └── thumbs/   # Preview images
```

**Important for Railway/Production**: Use `/data` or `/tmp` for writable storage (Railway filesystem is read-only except these paths).

## Offline-First Considerations

The PWA uses **IndexedDB** for offline storage:

- Audio notes are recorded offline and queued for sync
- Photos are captured and stored locally with base64 data
- Sync queue automatically processes pending items when online
- Service worker caches static assets

**When modifying offline features:**
1. Update IndexedDB schema in `services/offlineStorage.js`
2. Update service worker in `public/sw.js`
3. Test offline→online sync thoroughly
4. Handle conflicts gracefully (show user dialog for duplicates)

## Common Pitfalls

1. **List-of-lists format**: Always use nested arrays `[["value1", "value2"]]` for rapporti, inclusi, campioni fields, never flat arrays
2. **Database context**: Auth endpoints use `get_auth_db()`, PyArchInit endpoints use `get_db(user_id)`
3. **CORS**: Add new frontend URLs to `CORS_ORIGINS` in `.env`
4. **File paths**: Use `/tmp` or `/data` for Railway, not relative paths
5. **JWT expiration**: Tokens expire after 30 days (configurable in `auth_service.py`)
6. **Media paths**: Image paths in database are relative to `PYARCHINIT_MEDIA_ROOT`, not absolute

## Testing Strategy

- **Backend**: Use `/docs` endpoint for interactive API testing
- **Frontend**: Test offline mode by toggling browser DevTools → Network → Offline
- **Mobile**: Use ngrok for HTTPS testing (required for camera/microphone on iOS)
- **Database isolation**: Verify separate databases created or RLS policies active

## Production Deployment

**Railway (Backend):**
- Automatically deploys from `main` branch
- Requires volume mounted at `/data` for persistence
- Set all environment variables in Railway dashboard

**Vercel (Frontend):**
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `frontend`
- Environment variable: `VITE_API_URL=<railway-backend-url>`

See `DEPLOYMENT.md` for detailed instructions.

## Important Files to Check Before Modifying

- **Database schema changes**: Update `models/database.py` and run migrations
- **Auth changes**: Update both `models/auth.py` and `services/auth_service.py`
- **AI prompt changes**: Modify prompts in `services/ai_processor.py` (lines 70-200)
- **Offline storage**: Update `services/offlineStorage.js` schema and version number
- **API changes**: Update corresponding frontend axios calls in `App.jsx` or component files