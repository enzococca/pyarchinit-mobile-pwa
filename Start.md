# Start.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PyArchInit Mobile PWA is an offline-first Progressive Web Application for archaeological field documentation. It integrates with the existing PyArchInit PostgreSQL database system, providing mobile-optimized audio and photo capture with AI-powered interpretation (Whisper for transcription, Claude for data extraction).

## Development Commands

### Frontend (React PWA)
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py           # Start server (http://localhost:8000)
```

### Docker (Full Stack)
```bash
docker-compose up        # Start all services (backend, frontend, db, redis, celery)
docker-compose down      # Stop all services
```

### Testing Mobile on Same Network
```bash
# Backend
cd backend
python main.py --host 0.0.0.0

# Frontend
cd frontend
npm run dev -- --host

# Access from mobile device: http://<your-computer-ip>:5173
```

## High-Level Architecture

### Data Flow Pattern
```
Mobile Device (Offline/Online)
  ↓
PWA Frontend (React)
  ├─ AudioRecorder → IndexedDB (offline storage)
  ├─ PhotoCapture → IndexedDB
  └─ SyncService → (when online) → Backend API
       ↓
Backend (FastAPI)
  ├─ ImageProcessor → Generate thumb/resize/original
  ├─ AIProcessor → Whisper (audio→text) + Claude (text→structured data)
  └─ Database Layer → PostgreSQL (PyArchInit)
```

### Key Components

**Frontend Services (`frontend/src/services/`):**
- `offlineStorage.js`: IndexedDB abstraction layer with stores for `audioNotes`, `images`, `syncQueue`, `settings`
- `syncService.js`: Handles online/offline sync with retry logic and progress tracking

**Frontend Components (`frontend/src/components/`):**
- `AudioRecorder.jsx`: Web Audio API recording with pause/resume
- `PhotoCapture.jsx`: Camera access via getUserMedia with gallery upload option

**Backend Services (`backend/services/`):**
- `image_processor.py`: Creates 3 versions (thumb 150x150, resize 800x600, original), extracts EXIF (GPS, date, camera)
- `ai_processor.py`: Whisper transcription → Claude interpretation → structured archaeological data extraction

**Backend API Endpoints (`backend/main.py`):**
- `/api/media/upload-image`: Upload photos with metadata, auto-process images
- `/api/notes/upload-audio`: Upload audio files for processing
- `/api/notes/{note_id}/process`: AI transcription + interpretation
- `/api/media/file/{media_id}/{size}`: Retrieve image (thumb/resize/original)
- `/api/sites`: List archaeological sites

### Database Integration

Connects to existing PyArchInit PostgreSQL database:
- **`site_table`**: Archaeological sites
- **`us_table`**: Stratigraphic units (US) with full archaeological fields
- **`media_table`**: Photos with EXIF metadata, GPS coordinates, entity references
- **`mobile_notes`**: Custom table for audio recordings with transcription and AI interpretation

### Offline-First Architecture

1. All data saved to IndexedDB first (works offline)
2. Items added to `syncQueue` with priority
3. `syncService.setupAutoSync()` monitors connectivity
4. When online, batch syncs pending items with retry logic
5. Updates IndexedDB status after successful sync

### AI Processing Pipeline

Audio notes flow:
1. User records audio → stored in IndexedDB
2. When synced, backend receives audio file
3. OpenAI Whisper API transcribes audio → text
4. Claude AI interprets text with archaeological context → extracts structured fields (US number, description, interpretation, period, etc.)
5. System stores transcription + interpretation in `mobile_notes` table
6. User validates/corrects before final database insertion

## Configuration

### Environment Variables (`.env`)
Required for backend:
```bash
# Database (PyArchInit)
PYARCHINIT_DB_HOST=localhost
PYARCHINIT_DB_PORT=5432
PYARCHINIT_DB_NAME=pyarchinit_db
PYARCHINIT_DB_USER=postgres
PYARCHINIT_DB_PASSWORD=your_password

# Media paths (must exist and be writable)
PYARCHINIT_MEDIA_ROOT=/path/to/media
PYARCHINIT_MEDIA_THUMB=/path/to/media/thumb
PYARCHINIT_MEDIA_RESIZE=/path/to/media/resize

# AI Services (required for audio processing)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your_secret_key
```

Frontend environment (`.env` in frontend/):
```bash
VITE_API_URL=http://localhost:8000
```

### Important Settings (`backend/config.py`)
- **Max upload sizes**: Audio 25MB, Images 10MB
- **Image sizes**: Thumb 150x150px, Resize 800x600px
- **Supported formats**:
  - Audio: mp3, wav, m4a, ogg, webm
  - Images: jpg, jpeg, png, tiff
- **PWA caching**: 100 API entries, 24-hour expiration

## Development Patterns

### File Editing Best Practices
When modifying PyArchInit database integration:
- Check existing table schemas in `backend/models/database.py`
- Maintain compatibility with PyArchInit field naming conventions
- Never modify PyArchInit core tables structure
- Use `mobile_notes` table for custom mobile-specific data

### Image Processing
Images are always processed in 3 versions:
- Filename pattern: `{sito}_{entity_type}_{entity_id}_{timestamp}.{ext}`
- Location: `PYARCHINIT_MEDIA_ROOT/{original|thumb|resize}/`
- Database records in `media_table` with references to all versions

### Audio Processing
- Store audio temporarily during processing
- Always save transcription before AI interpretation
- Keep original audio file path in `mobile_notes.audio_path`
- Set status: `pending` → `processed` → `validated` → `error` (if failed)

### Sync Queue Management
When adding new sync types, update `syncService.js`:
1. Add item to IndexedDB `syncQueue` with type and priority
2. Implement sync handler in `syncService.js` (e.g., `syncAudioNote()`, `syncImage()`)
3. Update `syncAll()` to handle new type
4. Add retry logic for failures

## Common Issues

### "Permission denied" for media directories
```bash
mkdir -p /tmp/pyarchinit_media/{original,thumb,resize}
chmod 755 /tmp/pyarchinit_media
# Update PYARCHINIT_MEDIA_ROOT in .env
```

### Anthropic library compatibility issues
If you encounter `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`:
```bash
pip install --upgrade anthropic httpx
# Update requirements.txt to anthropic>=0.72.1
```

### OpenCV is optional
The system works without OpenCV (used only for advanced auto-tagging). If cv2 is not available, auto-tagging returns "auto_tag_disabled".

### Camera/Microphone not working on mobile
- Must use HTTPS (required by browser APIs)
- Use ngrok for local testing with HTTPS
- iOS requires Safari (Chrome iOS has limitations)
- Ensure permissions granted in browser

### Database connection issues
- Verify PostgreSQL is running: `sudo service postgresql status`
- Test connection: `psql -h localhost -U postgres -d pyarchinit_db`
- Check credentials in `.env` match database config

### IndexedDB quota exceeded
- IndexedDB default quota: ~50MB on mobile, ~10GB on desktop
- Clear old synced items: `offlineStorage.clearSyncedItems()`
- Compress audio before storing (already implemented via MediaRecorder options)

## Deployment Targets

- **Local Development**: Manual setup with venv + npm
- **Docker**: Complete stack via `docker-compose up`
- **Production**:
  - Frontend: Cloudflare Pages (PWA hosting)
  - Backend: Cloudflare Workers (Python/FastAPI) or traditional VPS
  - Database: External PostgreSQL (existing PyArchInit installation)

## API Cost Considerations

AI processing costs per audio note (approximate):
- Whisper transcription: €0.006/minute
- Claude interpretation: €0.015/1000 tokens (~200-300 tokens per note)
- **Total**: ~€0.05 per audio note

For field projects with many notes, consider:
- Batch processing during off-peak hours
- User validation before AI processing (optional flag)
- Caching common interpretations
