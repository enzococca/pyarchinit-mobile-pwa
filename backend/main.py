import sys
import os
# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
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
from backend.models.database import get_db, Media, MobileNote, US, Site, init_db
from backend.services.image_processor import ImageProcessor, ImageValidator
from backend.services.ai_processor import ArchaeologicalAIInterpreter
from backend.services.stratigraphic_utils import parse_relationships, format_relationships_for_db


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

# Initialize database (create tables if using SQLite)
if settings.USE_SQLITE:
    init_db()

app = FastAPI(
    title="PyArchInit Mobile API",
    description="API per gestione note vocali e foto archeologiche",
    version="1.0.0"
)

# CORS - Allow all origins for development (ngrok, mobile testing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        note.ai_interpretation = str(result['interpretation'])
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
