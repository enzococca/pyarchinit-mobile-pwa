import sys
import os
import json
# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import create_engine, inspect, text
from typing import List, Optional
import shutil
from pathlib import Path
from datetime import datetime
from pydantic import BaseModel

from backend.config import settings
from backend.models.database import get_db, Media, MobileNote, US, Site, Model3D, init_db
from backend.services.db_manager import get_auth_db
from backend.services.image_processor import ImageProcessor, ImageValidator
from backend.services.ai_processor import ArchaeologicalAIInterpreter
from backend.services.stratigraphic_utils import parse_relationships, format_relationships_for_db
from backend.services.auth_service import get_current_user
from backend.models.auth import User
from backend.routes import auth, media, database, notes, tropy, annotations, projects


# Pydantic models for API requests
class DatabaseConfig(BaseModel):
    type: str  # 'sqlite' or 'postgresql'
    path: Optional[str] = None  # For SQLite
    host: Optional[str] = None  # For PostgreSQL
    port: Optional[str] = None
    database: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None


class ConfirmNoteRequest(BaseModel):
    extracted_fields: dict
    entity_type: str
    target_table: str
    force_action: Optional[str] = None  # 'merge' or 'overwrite'

# ============================================================================
# DATABASE INITIALIZATION (TWO SEPARATE DATABASES)
# ============================================================================
# 1. Auth Database (ALWAYS SQLite) - User accounts, webapp-level auth
# 2. PyArchInit Database (SQLite or PostgreSQL) - Archaeological data
# ============================================================================

print("=" * 60)
print("🗄️  Initializing databases...")
print("=" * 60)

# 1. Initialize Auth Database (ALWAYS runs, even in PostgreSQL mode)
try:
    from backend.init_auth_tables import init_auth_tables
    print("📝 Initializing auth database...")
    init_auth_tables()
    print("✅ Auth database initialized")
except Exception as e:
    import logging
    logging.error(f"❌ Auth database initialization failed: {e}")
    raise

# 2. Initialize PyArchInit Database (only if SQLite mode)
if settings.USE_SQLITE or settings.DB_MODE == "sqlite":
    try:
        print("📝 Initializing PyArchInit database (SQLite mode)...")
        init_db()
        print("✅ PyArchInit database initialized")
    except Exception as e:
        import logging
        logging.error(f"❌ PyArchInit database initialization failed: {e}")
        raise
else:
    print(f"ℹ️  PyArchInit database mode: {settings.DB_MODE} (PostgreSQL - tables should exist)")

# 3. Run Automatic Migrations on BOTH databases
try:
    from backend.migrations.auto_migrate import run_auto_migrations
    from backend.services.db_manager import get_auth_engine, get_engine

    # Get both engines
    auth_engine = get_auth_engine()
    pyarchinit_engine = get_engine()

    # Run migrations on both
    run_auto_migrations(
        auth_engine=auth_engine,
        pyarchinit_engine=pyarchinit_engine
    )
except Exception as e:
    import logging
    logging.warning(f"⚠️  Auto-migration warning: {e}")

print("=" * 60)
print("✅ All databases initialized successfully")
print("=" * 60)

app = FastAPI(
    title="PyArchInit Mobile API",
    description="API per gestione note vocali e foto archeologiche",
    version="1.0.0"
)

# CORS configuration
# For production, use specific origins from settings
# For development/testing, allow all origins
cors_origins = ["*"]  # Default to allow all for development
if os.getenv("ENVIRONMENT") == "production":
    # In production, use specific origins from config
    cors_origins = settings.CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(media.router)
app.include_router(database.router)
app.include_router(notes.router)
app.include_router(tropy.router)
app.include_router(annotations.router)

# Inizializza servizi
image_processor = ImageProcessor()
ai_interpreter = ArchaeologicalAIInterpreter()

# ============= HEALTH CHECK =============

@app.get("/")
async def root():
    return {
        "app": "PyArchInit Mobile API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Verifica connessione database e servizi"""
    try:
        # Test database
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "media_paths": {
                "original": str(settings.PYARCHINIT_MEDIA_ORIGINAL),
                "thumb": str(settings.PYARCHINIT_MEDIA_THUMB),
                "resize": str(settings.PYARCHINIT_MEDIA_RESIZE)
            }
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )


@app.post("/api/database/test-connection")
async def test_database_connection(config: DatabaseConfig):
    """Test database connection with provided configuration"""
    try:
        # Build connection string
        if config.type == 'sqlite':
            if not config.path:
                raise HTTPException(status_code=400, detail="SQLite path is required")
            db_url = f"sqlite:///{config.path}"
        elif config.type == 'postgresql':
            if not all([config.host, config.port, config.database, config.user]):
                raise HTTPException(status_code=400, detail="PostgreSQL connection parameters are incomplete")
            password = config.password or ''
            db_url = f"postgresql://{config.user}:{password}@{config.host}:{config.port}/{config.database}"
        else:
            raise HTTPException(status_code=400, detail="Database type must be 'sqlite' or 'postgresql'")

        # Try to connect
        test_engine = create_engine(db_url, connect_args={"check_same_thread": False} if config.type == 'sqlite' else {})

        # Test connection and get stats
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))

            # Get table count
            inspector = inspect(test_engine)
            tables = inspector.get_table_names()

            # Try to query some stats
            try:
                from sqlalchemy.orm import sessionmaker
                TestSession = sessionmaker(bind=test_engine)
                test_session = TestSession()

                # Import models to query
                from backend.models.database import Site, US

                site_count = test_session.query(Site).count()
                us_count = test_session.query(US).count()

                test_session.close()

                return {
                    "success": True,
                    "message": f"Successfully connected to {config.type} database",
                    "stats": {
                        "tables": len(tables),
                        "sites": site_count,
                        "us_records": us_count
                    }
                }
            except Exception as e:
                # If we can't query stats, still return success for connection
                return {
                    "success": True,
                    "message": f"Connected to {config.type} database (stats unavailable)",
                    "stats": {
                        "tables": len(tables),
                        "sites": "N/A",
                        "us_records": "N/A"
                    }
                }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============= DATABASE MODE MANAGEMENT =============

@app.get("/api/auth/db-mode")
async def get_database_mode(current_user: dict = Depends(get_current_user), db: Session = Depends(get_auth_db)):
    """Get current user's database mode configuration"""
    from backend.models.auth import User

    user = db.query(User).filter(User.id == current_user['user_id']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "mode": user.db_mode or "sqlite",
        "config": {
            "host": user.pg_host,
            "port": user.pg_port,
            "database": user.pg_database,
            "user": user.pg_user
        } if user.db_mode in ["separate", "hybrid"] else None
    }


@app.post("/api/database/configure")
async def configure_database(
    mode: str = Body(...),
    config: dict = Body(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """Save database configuration for current user"""
    from backend.models.auth import User

    # Validate mode
    if mode not in ["sqlite", "separate", "hybrid"]:
        raise HTTPException(status_code=400, detail="Invalid database mode")

    user = db.query(User).filter(User.id == current_user['user_id']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update user database mode
    user.db_mode = mode

    # If PostgreSQL mode, save connection details
    if mode in ["separate", "hybrid"] and config:
        user.pg_host = config.get("host")
        user.pg_port = config.get("port")
        user.pg_database = config.get("database")
        user.pg_user = config.get("user")
        user.pg_password = config.get("password")  # TODO: Encrypt in production

    db.commit()

    return {
        "success": True,
        "message": f"Database mode updated to {mode}",
        "mode": mode
    }


@app.post("/api/database/upload-sqlite")
async def upload_sqlite_database(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """Upload SQLite database file for current user"""
    from backend.models.auth import User
    import shutil

    # Validate file extension
    if not file.filename.endswith(('.sqlite', '.db')):
        raise HTTPException(status_code=400, detail="File must be .sqlite or .db")

    user = db.query(User).filter(User.id == current_user['user_id']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        # Create user-specific SQLite directory
        sqlite_dir = settings.PYARCHINIT_MEDIA_ROOT / "sqlite" / str(user.id)
        sqlite_dir.mkdir(parents=True, exist_ok=True)

        # Save uploaded file
        db_filename = f"pyarchinit_user_{user.id}.sqlite"
        db_path = sqlite_dir / db_filename

        with open(db_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Update user's SQLite path
        user.sqlite_db_path = str(db_path)
        user.db_mode = "sqlite"
        db.commit()

        return {
            "success": True,
            "message": "SQLite database uploaded successfully",
            "path": str(db_path)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading database: {str(e)}")


@app.get("/api/database/download-sqlite")
async def download_sqlite_database(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """Download current user's SQLite database"""
    from backend.models.auth import User

    user = db.query(User).filter(User.id == current_user['user_id']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If user has a custom SQLite file, return that
    if user.sqlite_db_path and Path(user.sqlite_db_path).exists():
        db_path = Path(user.sqlite_db_path)
        filename = f"pyarchinit_user_{user.id}_{datetime.now().strftime('%Y%m%d')}.sqlite"

        return FileResponse(
            path=str(db_path),
            filename=filename,
            media_type="application/octet-stream"
        )

    # Otherwise, return the system SQLite database if USE_SQLITE is enabled
    if settings.USE_SQLITE:
        system_db_path = "/tmp/pyarchinit_db.sqlite"
        if Path(system_db_path).exists():
            filename = f"pyarchinit_{datetime.now().strftime('%Y%m%d')}.sqlite"
            return FileResponse(
                path=system_db_path,
                filename=filename,
                media_type="application/octet-stream"
            )

    raise HTTPException(status_code=404, detail="No SQLite database found")


# ============= ADMIN USER MANAGEMENT =============

def get_current_admin(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Verify current user is an admin"""
    from backend.models.auth import User

    user = db.query(User).filter(User.id == current_user['user_id']).first()
    if not user or user.role != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@app.get("/api/admin/users")
async def list_all_users(admin: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """List all users (admin only)"""
    from backend.models.auth import User

    users = db.query(User).all()

    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "is_active": u.is_active,
                "approval_status": getattr(u, 'approval_status', 'approved'),
                "db_mode": u.db_mode,
                "created_at": u.created_at.isoformat() if u.created_at else None
            }
            for u in users
        ]
    }


@app.post("/api/admin/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    is_active: bool = Body(...),
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a user (admin only)"""
    from backend.models.auth import User

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from deactivating themselves
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user.is_active = is_active
    db.commit()

    return {
        "success": True,
        "message": f"User {'activated' if is_active else 'deactivated'} successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active
        }
    }


@app.post("/api/admin/users/{user_id}/role")
async def change_user_role(
    user_id: int,
    role: str = Body(...),
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Change user role (admin only)"""
    from backend.models.auth import User

    # Validate role
    valid_roles = ['admin', 'archaeologist', 'student', 'viewer']
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from changing their own role
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user.role = role
    db.commit()

    return {
        "success": True,
        "message": f"User role updated to {role}",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role
        }
    }


@app.post("/api/admin/users/{user_id}/approve")
async def approve_user(
    user_id: int,
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Approve user registration (admin only)"""
    from backend.models.auth import User

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update approval status
    user.approval_status = "approved"
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} approved successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "approval_status": user.approval_status
        }
    }


@app.post("/api/admin/users/{user_id}/reject")
async def reject_user(
    user_id: int,
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Reject user registration (admin only)"""
    from backend.models.auth import User

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update approval status
    user.approval_status = "rejected"
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} rejected",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "approval_status": user.approval_status
        }
    }


# ============= GESTIONE SITI =============

@app.get("/api/sites")
async def list_sites(db: Session = Depends(get_db)):
    """Lista tutti i siti disponibili"""
    sites = db.query(Site).all()
    return {
        "sites": [
            {
                "id": s.id_sito,
                "name": s.sito,
                "location": f"{s.comune}, {s.provincia}, {s.nazione}"
            }
            for s in sites
        ]
    }

# ============= UPLOAD IMMAGINI =============

@app.post("/api/media/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    entity_type: str = Form(...),  # 'US', 'TOMBA', 'MATERIALE'
    entity_id: int = Form(...),
    sito: str = Form(...),
    us: Optional[int] = Form(None),
    descrizione: Optional[str] = Form(None),
    photographer: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    auto_tag: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Upload e processamento immagine per PyArchInit
    - Crea thumb, resize, original
    - Estrae EXIF
    - Auto-tagging opzionale
    - Crea record in media_table
    """
    
    # Validazione
    is_valid, error = ImageValidator.validate(file)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
    
    try:
        # Process immagine
        media = image_processor.process_image(
            image_file=file,
            entity_type=entity_type,
            entity_id=entity_id,
            sito=sito,
            us=us,
            descrizione=descrizione,
            photographer=photographer,
            tags=tags
        )
        
        # Auto-tagging se richiesto
        if auto_tag:
            original_path = settings.PYARCHINIT_MEDIA_ORIGINAL / media.filename
            auto_tags = image_processor.auto_tag_image(original_path)
            if auto_tags:
                media.tags = f"{media.tags},{auto_tags}" if media.tags else auto_tags
                db.commit()
        
        return {
            "status": "success",
            "media_id": media.id_media,
            "filename": media.filename,
            "paths": {
                "original": media.media_path_original,
                "thumb": media.media_path_thumb,
                "resize": media.media_path_resize
            },
            "metadata": {
                "photographer": media.photographer,
                "date_shot": media.date_shot,
                "gps": {
                    "lat": media.coord_y,
                    "lon": media.coord_x
                }
            },
            "tags": media.tags
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore processing: {str(e)}")

@app.post("/api/media/upload-images-batch")
async def upload_images_batch(
    files: List[UploadFile] = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    sito: str = Form(...),
    us: Optional[int] = Form(None),
    photographer: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload multiplo immagini"""
    
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Max 20 immagini per batch")
    
    results = []
    errors = []
    
    for file in files:
        try:
            is_valid, error = ImageValidator.validate(file)
            if not is_valid:
                errors.append({"filename": file.filename, "error": error})
                continue
            
            media = image_processor.process_image(
                image_file=file,
                entity_type=entity_type,
                entity_id=entity_id,
                sito=sito,
                us=us,
                photographer=photographer
            )
            
            results.append({
                "filename": file.filename,
                "media_id": media.id_media,
                "status": "success"
            })
            
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {
        "total": len(files),
        "processed": len(results),
        "errors": len(errors),
        "results": results,
        "errors_detail": errors
    }

# ============= RECUPERO IMMAGINI =============

@app.get("/api/media/image/{media_id}")
async def get_image_info(media_id: int, db: Session = Depends(get_db)):
    """Ottiene info su immagine"""
    media = db.query(Media).filter(Media.id_media == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media non trovato")
    
    return {
        "id": media.id_media,
        "filename": media.filename,
        "entity": {
            "type": media.entity_type,
            "id": media.id_entity
        },
        "sito": media.sito,
        "us": media.us,
        "descrizione": media.descrizione,
        "tags": media.tags.split(",") if media.tags else [],
        "photographer": media.photographer,
        "date_shot": media.date_shot,
        "gps": {
            "lat": media.coord_y,
            "lon": media.coord_x
        },
        "paths": {
            "original": f"/api/media/file/{media_id}/original",
            "thumb": f"/api/media/file/{media_id}/thumb",
            "resize": f"/api/media/file/{media_id}/resize"
        }
    }

@app.get("/api/media/file/{media_id}/{size}")
async def get_image_file(
    media_id: int,
    size: str,  # 'original', 'thumb', 'resize'
    db: Session = Depends(get_db)
):
    """Serve file immagine"""
    media = db.query(Media).filter(Media.id_media == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media non trovato")
    
    # Determina path
    if size == "thumb":
        file_path = settings.PYARCHINIT_MEDIA_THUMB / media.filename
    elif size == "resize":
        file_path = settings.PYARCHINIT_MEDIA_RESIZE / media.filename
    else:
        file_path = settings.PYARCHINIT_MEDIA_ORIGINAL / media.filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File non trovato")
    
    return FileResponse(file_path)

@app.get("/api/media/by-entity/{entity_type}/{entity_id}")
async def get_media_by_entity(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db)
):
    """Lista media per entità (US, TOMBA, etc.)"""
    media_list = db.query(Media).filter(
        Media.entity_type == entity_type,
        Media.id_entity == entity_id
    ).all()
    
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "count": len(media_list),
        "media": [
            {
                "id": m.id_media,
                "filename": m.filename,
                "thumb": f"/api/media/file/{m.id_media}/thumb",
                "descrizione": m.descrizione,
                "tags": m.tags.split(",") if m.tags else []
            }
            for m in media_list
        ]
    }

# ============= MODELLI 3D =============

@app.post("/api/3d-models/upload")
async def upload_3d_model(
    file: UploadFile = File(...),
    entity_type: str = Form(...),  # 'US', 'SITE', 'TOMBA'
    entity_id: Optional[int] = Form(None),
    sito: str = Form(...),
    us_id: Optional[int] = Form(None),
    model_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    capture_method: Optional[str] = Form("manual_upload"),  # 'lidar', 'photogrammetry', 'manual_upload', 'external_app'
    capture_app: Optional[str] = Form(None),  # 'Polycam', 'KIRI Engine', etc.
    gps_lat: Optional[float] = Form(None),
    gps_lon: Optional[float] = Form(None),
    gps_altitude: Optional[float] = Form(None),
    uploaded_by: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload 3D model (OBJ, GLTF, GLB, USDZ)
    - Validates file format and size
    - Saves to 3D models directory
    - Creates database record
    """

    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_3D_MODEL_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato non supportato. Formati permessi: {', '.join(settings.ALLOWED_3D_MODEL_FORMATS)}"
        )

    # Read file and check size
    contents = await file.read()
    file_size = len(contents)

    if file_size > settings.MAX_3D_MODEL_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File troppo grande. Massimo {settings.MAX_3D_MODEL_SIZE / (1024*1024):.0f}MB"
        )

    try:
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_sito = sito.replace(" ", "_")
        filename = f"{safe_sito}_{entity_type}_{timestamp}{file_ext}"

        # Save to original directory
        filepath = settings.PYARCHINIT_3D_MODELS_ORIGINAL / filename
        with open(filepath, "wb") as f:
            f.write(contents)

        # Determine file format
        file_format = file_ext.replace(".", "").upper()

        # Create database record
        model_3d = Model3D(
            id_entity=entity_id,
            entity_type=entity_type,
            sito=sito,
            us_id=us_id,
            filename=filename,
            filepath=str(filepath),
            file_format=file_format,
            file_size=file_size,
            model_name=model_name or filename,
            description=description,
            capture_method=capture_method,
            capture_app=capture_app,
            gps_lat=gps_lat,
            gps_lon=gps_lon,
            gps_altitude=gps_altitude,
            uploaded_by=uploaded_by,
            created_at=datetime.utcnow()
        )

        db.add(model_3d)
        db.commit()
        db.refresh(model_3d)

        return {
            "status": "success",
            "model_id": model_3d.id_3d_model,
            "filename": filename,
            "file_format": file_format,
            "file_size": file_size,
            "filepath": str(filepath),
            "metadata": {
                "entity_type": entity_type,
                "entity_id": entity_id,
                "sito": sito,
                "capture_method": capture_method,
                "capture_app": capture_app,
                "gps": {
                    "lat": gps_lat,
                    "lon": gps_lon,
                    "altitude": gps_altitude
                }
            }
        }

    except Exception as e:
        db.rollback()
        # Clean up file if saved
        if filepath.exists():
            filepath.unlink()
        raise HTTPException(status_code=500, detail=f"Errore durante l'upload: {str(e)}")


@app.get("/api/3d-models/{model_id}")
async def get_3d_model(model_id: int, db: Session = Depends(get_db)):
    """Get 3D model by ID"""
    model = db.query(Model3D).filter(Model3D.id_3d_model == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="Modello 3D non trovato")

    return {
        "id": model.id_3d_model,
        "filename": model.filename,
        "file_format": model.file_format,
        "file_size": model.file_size,
        "model_name": model.model_name,
        "description": model.description,
        "entity_type": model.entity_type,
        "entity_id": model.id_entity,
        "sito": model.sito,
        "capture_method": model.capture_method,
        "capture_app": model.capture_app,
        "gps": {
            "lat": model.gps_lat,
            "lon": model.gps_lon,
            "altitude": model.gps_altitude
        },
        "uploaded_by": model.uploaded_by,
        "created_at": model.created_at.isoformat() if model.created_at else None
    }


@app.get("/api/3d-models/by-entity/{entity_type}/{entity_id}")
async def get_3d_models_by_entity(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db)
):
    """List 3D models for entity (US, SITE, etc.)"""
    models = db.query(Model3D).filter(
        Model3D.entity_type == entity_type,
        Model3D.id_entity == entity_id
    ).all()

    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "count": len(models),
        "models": [
            {
                "id": m.id_3d_model,
                "filename": m.filename,
                "file_format": m.file_format,
                "model_name": m.model_name,
                "capture_method": m.capture_method,
                "file_size": m.file_size,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in models
        ]
    }


@app.get("/api/3d-models/download/{model_id}")
async def download_3d_model(model_id: int, db: Session = Depends(get_db)):
    """Download 3D model file"""
    model = db.query(Model3D).filter(Model3D.id_3d_model == model_id).first()

    if not model:
        raise HTTPException(status_code=404, detail="Modello 3D non trovato")

    filepath = Path(model.filepath)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File del modello non trovato")

    return FileResponse(
        path=str(filepath),
        filename=model.filename,
        media_type="application/octet-stream"
    )

# ============= NOTE VOCALI =============

@app.post("/api/notes/upload-audio")
async def upload_audio_note(
    file: UploadFile = File(...),
    sito: str = Form(...),
    recorded_by: Optional[str] = Form(None),
    gps_lat: Optional[float] = Form(None),
    gps_lon: Optional[float] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload nota vocale
    - Salva audio
    - Avvia trascrizione (asincrona se possibile)
    """
    
    # Valida formato audio
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato audio non supportato. Usa: {settings.ALLOWED_AUDIO_FORMATS}"
        )
    
    # Salva audio temporaneo
    temp_dir = Path("/tmp/pyarchinit_audio")
    temp_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    audio_filename = f"note_{timestamp}_{file.filename}"
    audio_path = temp_dir / audio_filename
    
    with open(audio_path, 'wb') as f:
        shutil.copyfileobj(file.file, f)
    
    # Crea record nota
    note = MobileNote(
        audio_filename=audio_filename,
        audio_path=str(audio_path),
        site_context=sito,
        recorded_by=recorded_by,
        gps_lat=gps_lat,
        gps_lon=gps_lon,
        status='pending'
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    # TODO: Avvia processing asincrono con Celery
    # process_audio_note.delay(note.id)
    
    return {
        "status": "uploaded",
        "note_id": note.id,
        "message": "Nota caricata. Processing avviato."
    }

@app.post("/api/notes/{note_id}/process")
async def process_note(note_id: int, db: Session = Depends(get_db)):
    """
    Processa nota vocale:
    1. Trascrizione con Whisper
    2. Interpretazione con Claude AI
    """
    note = db.query(MobileNote).filter(MobileNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Nota non trovata")
    
    try:
        # Processing completo
        result = ai_interpreter.process_audio_note(
            Path(note.audio_path),
            note.site_context
        )
        
        if result['status'] == 'error':
            raise Exception(result['error'])
        
        # Update record with transcription and interpretation
        note.transcription = result['transcription']['text']
        note.transcription_confidence = result['transcription']['confidence']
        note.detected_language = result['transcription'].get('language', 'it')
        note.ai_interpretation = json.dumps(result['interpretation'], ensure_ascii=False)
        note.ai_confidence = result['interpretation']['confidence']
        note.suggested_entity_type = result['interpretation']['entity_type']
        note.suggested_table = result['interpretation']['target_table']
        note.status = 'processed'
        
        db.commit()
        
        return {
            "status": "success",
            "note_id": note.id,
            "transcription": result['transcription'],
            "interpretation": result['interpretation']
        }
        
    except Exception as e:
        note.status = 'error'
        db.commit()
        raise HTTPException(status_code=500, detail=f"Errore processing: {str(e)}")

@app.get("/api/notes")
async def list_notes(
    status: Optional[str] = None,
    sito: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Lista note vocali con filtri"""
    query = db.query(MobileNote)

    if status:
        query = query.filter(MobileNote.status == status)
    if sito:
        query = query.filter(MobileNote.site_context == sito)

    notes = query.order_by(MobileNote.created_at.desc()).limit(limit).all()

    def parse_interpretation(ai_interp):
        """Convert Python dict string to JSON-compatible format"""
        if not ai_interp:
            return None
        try:
            # Try to eval Python dict string and convert to JSON
            import ast
            parsed = ast.literal_eval(ai_interp)
            return parsed
        except:
            # If fails, return as is
            return ai_interp

    return {
        "count": len(notes),
        "notes": [
            {
                "id": n.id,
                "status": n.status,
                "transcription": n.transcription,
                "interpretation": parse_interpretation(n.ai_interpretation),  # Convert to JSON-compatible format
                "ai_confidence": n.ai_confidence,
                "suggested_entity": n.suggested_entity_type,
                "recorded_at": n.recorded_at.isoformat() if n.recorded_at else None,
                "recorded_by": n.recorded_by
            }
            for n in notes
        ]
    }

@app.post("/api/notes/{note_id}/validate")
async def validate_note(
    note_id: int,
    validated_by: str = Form(...),
    approved: bool = Form(...),
    corrections: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Valida nota processata e crea record in PyArchInit se approvata
    """
    note = db.query(MobileNote).filter(MobileNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Nota non trovata")
    
    if not approved:
        note.status = 'rejected'
        note.validated_by = validated_by
        note.validated_at = datetime.utcnow()
        db.commit()
        
        return {
            "status": "rejected",
            "note_id": note.id
        }
    
    # Parse interpretazione AI
    import json
    interpretation = json.loads(note.ai_interpretation) if isinstance(note.ai_interpretation, str) else note.ai_interpretation
    
    # TODO: Crea record nella tabella PyArchInit appropriata
    # Esempio per US:
    if interpretation['target_table'] == 'us_table':
        fields = interpretation['extracted_fields']
        # us_record = US(
        #     sito=note.site_context,
        #     us=fields.get('us'),
        #     descrizione=fields.get('descrizione'),
        #     ...
        # )
        # db.add(us_record)
    
    note.status = 'validated'
    note.validated_by = validated_by
    note.validated_at = datetime.utcnow()
    db.commit()
    
    return {
        "status": "validated",
        "note_id": note.id,
        "message": "Note validated successfully"
    }


@app.post("/api/notes/{note_id}/confirm")
async def confirm_note(
    note_id: int,
    request: ConfirmNoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm and save validated note data to PyArchInit database
    """
    note = db.query(MobileNote).filter(MobileNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    extracted_fields = request.extracted_fields
    entity_type = request.entity_type
    target_table = request.target_table

    try:
        # Save to appropriate PyArchInit table based on entity_type
        if target_table == 'us_table' or entity_type == 'US':
            # Extract US fields - prioritize AI extracted sito over note.site_context
            # This ensures case-sensitivity is preserved as extracted by AI
            sito = extracted_fields.get('sito') or note.site_context

            # Check if US already exists (duplicate detection)
            # Convert values to strings for consistent comparison
            check_sito = str(sito) if sito else None
            check_area = str(extracted_fields.get('area')) if extracted_fields.get('area') else None
            check_us = str(extracted_fields.get('us')) if extracted_fields.get('us') else None
            check_tipo = str(extracted_fields.get('unita_tipo', 'US'))

            print(f"[DUPLICATE CHECK] Sito: {check_sito}, Area: {check_area}, US: {check_us}, Tipo: {check_tipo}")
            print(f"[FORCE_ACTION] Received force_action: {request.force_action!r}, type: {type(request.force_action)}")

            existing_us = db.query(US).filter(
                US.sito == check_sito,
                US.area == check_area,
                US.us == check_us,
                US.unita_tipo == check_tipo
            ).first()

            if existing_us:
                print(f"[DUPLICATE FOUND] Existing US: id_us={existing_us.id_us}, sito={existing_us.sito}, area={existing_us.area}, us={existing_us.us}")

            # Handle duplicates based on force_action
            if existing_us and not request.force_action:
                # No force action - return error to show dialog
                raise HTTPException(
                    status_code=409,
                    detail=f"US already exists: {sito}, Area {extracted_fields.get('area')}, US {extracted_fields.get('us')}"
                )
            elif existing_us and request.force_action == 'overwrite':
                # Overwrite: Delete existing and create new
                db.delete(existing_us)
                db.flush()
            elif existing_us and request.force_action == 'merge':
                # Merge: Update existing record with new non-null fields
                for field_name, field_value in extracted_fields.items():
                    if field_value and hasattr(existing_us, field_name):
                        current_value = getattr(existing_us, field_name)
                        # Only update if current is None/empty or new value is different
                        if not current_value or current_value != field_value:
                            setattr(existing_us, field_name, field_value)

                # Update metadata
                existing_us.schedatore = note.recorded_by
                existing_us.data_schedatura = datetime.utcnow().strftime('%Y-%m-%d')

                db.commit()

                # Mark note as validated
                note.status = 'validated'
                note.validated_at = datetime.utcnow()
                db.commit()

                return {
                    "status": "success",
                    "note_id": note.id,
                    "message": f"Data merged successfully into existing US record"
                }

            # Check if site exists, create if not
            site = db.query(Site).filter(Site.sito == sito).first()
            if not site:
                site = Site(sito=sito)
                db.add(site)
                db.flush()  # Get the ID

            # Parse and format stratigraphic relationships
            rapporti_raw = extracted_fields.get('rapporti', [])
            rapporti_formatted = format_relationships_for_db(parse_relationships(rapporti_raw))

            # Helper function to convert to list-of-lists format
            def convert_to_list_of_lists(value):
                """Convert string or value to list-of-lists format for PyArchInit"""
                if isinstance(value, str) and value.strip():
                    # String -> [["String"]]
                    return [[value.strip()]]
                elif isinstance(value, list):
                    if len(value) == 0:
                        return []
                    # Already list-of-lists? Return as is
                    if all(isinstance(item, list) for item in value):
                        return value
                    # List of strings -> [["item1"], ["item2"]]
                    return [[item] for item in value if item]
                else:
                    return []

            # Parse other list-of-lists fields (including new ones)
            inclusi_raw = extracted_fields.get('inclusi', [])
            campioni_raw = extracted_fields.get('campioni', [])
            componenti_organici_raw = extracted_fields.get('componenti_organici', [])
            componenti_inorganici_raw = extracted_fields.get('componenti_inorganici', [])
            documentazione_raw = extracted_fields.get('documentazione', [])

            # Convert to list-of-lists if needed, then format as JSON
            inclusi_formatted = format_relationships_for_db(convert_to_list_of_lists(inclusi_raw))
            campioni_formatted = format_relationships_for_db(convert_to_list_of_lists(campioni_raw))
            componenti_organici_formatted = format_relationships_for_db(convert_to_list_of_lists(componenti_organici_raw))
            componenti_inorganici_formatted = format_relationships_for_db(convert_to_list_of_lists(componenti_inorganici_raw))
            documentazione_formatted = format_relationships_for_db(convert_to_list_of_lists(documentazione_raw))

            print(f"[INCLUSI/CAMPIONI] inclusi_raw: {inclusi_raw!r} (type: {type(inclusi_raw).__name__})")
            print(f"[INCLUSI/CAMPIONI] inclusi_formatted: {inclusi_formatted!r}")
            print(f"[INCLUSI/CAMPIONI] campioni_raw: {campioni_raw!r} (type: {type(campioni_raw).__name__})")
            print(f"[INCLUSI/CAMPIONI] campioni_formatted: {campioni_formatted!r}")

            # Get valid US model columns
            from sqlalchemy import inspect
            us_mapper = inspect(US)
            valid_columns = {col.key for col in us_mapper.columns}

            # Build US record kwargs, only including valid fields
            # Use normalized string values for consistency
            us_kwargs = {
                'sito': check_sito,
                'area': check_area,
                'us': check_us,
                'unita_tipo': check_tipo,
                'schedatore': note.recorded_by,
                'data_schedatura': datetime.utcnow().strftime('%Y-%m-%d'),
                'rapporti': rapporti_formatted,
                'inclusi': inclusi_formatted,
                'campioni': campioni_formatted,
                'componenti_organici': componenti_organici_formatted,
                'componenti_inorganici': componenti_inorganici_formatted,
                'documentazione': documentazione_formatted
            }

            # Add all other fields from extracted_fields if they exist in the model
            for field_name, field_value in extracted_fields.items():
                if field_name in valid_columns and field_name not in us_kwargs:
                    us_kwargs[field_name] = field_value

            # Create US record with validated fields only
            us_record = US(**us_kwargs)
            db.add(us_record)

        # TODO: Add handlers for other entity types (TOMBA, MATERIALE, etc.)

        # Mark note as validated and saved
        note.status = 'validated'
        note.validated_at = datetime.utcnow()

        db.commit()

        return {
            "status": "success",
            "note_id": note.id,
            "message": f"Data saved successfully to {target_table}"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving to database: {str(e)}")


@app.post("/api/notes/{note_id}/reject")
async def reject_note(note_id: int, db: Session = Depends(get_db)):
    """
    Reject a note - mark as rejected and don't save to database
    """
    note = db.query(MobileNote).filter(MobileNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.status = 'rejected'
    note.validated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "rejected",
        "note_id": note.id,
        "message": "Record creato in PyArchInit"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
