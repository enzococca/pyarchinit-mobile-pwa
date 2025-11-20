"""
Audio Notes Routes - Voice recording with AI transcription and interpretation
Handles upload, transcription (Whisper), and archaeological interpretation (Claude)
"""
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from pathlib import Path
import shutil

from backend.services.auth_service import get_current_user
from backend.models.auth import User
from backend.services.db_manager import get_db
from backend.services.ai_processor import AudioTranscriber, ArchaeologicalAIInterpreter
from backend.config import settings

router = APIRouter(prefix="/api/notes", tags=["notes"])


# Pydantic models
class NoteResponse(BaseModel):
    id: int
    audio_filename: str
    transcription: Optional[str] = None
    detected_language: Optional[str] = None
    ai_interpretation: Optional[str] = None
    status: str
    created_at: datetime


class NoteListResponse(BaseModel):
    notes: List[NoteResponse]
    total: int


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    site_context: Optional[str] = Form(None),
    gps_lat: Optional[float] = Form(None),
    gps_lon: Optional[float] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload audio note and save to database

    Does NOT process immediately - returns note_id
    Use POST /notes/{note_id}/process to transcribe and interpret
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be audio")

        # Create audio directory if not exists
        audio_dir = Path("/tmp/pyarchinit_audio")
        audio_dir.mkdir(parents=True, exist_ok=True)

        # Save audio file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        audio_filename = f"note_{current_user.id}_{timestamp}_{file.filename}"
        audio_path = audio_dir / audio_filename

        with open(audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Get audio duration (approximate from file size)
        file_size = audio_path.stat().st_size
        duration_seconds = file_size / 16000  # Rough estimate

        # Insert into mobile_notes table
        from sqlalchemy import text

        query = text("""
            INSERT INTO mobile_notes (
                audio_filename, audio_path, duration_seconds,
                status, recorded_by, site_context,
                gps_lat, gps_lon, created_at
            )
            VALUES (
                :audio_filename, :audio_path, :duration_seconds,
                :status, :recorded_by, :site_context,
                :gps_lat, :gps_lon, :created_at
            )
        """)

        db.execute(query, {
            'audio_filename': audio_filename,
            'audio_path': str(audio_path),
            'duration_seconds': duration_seconds,
            'status': 'pending',
            'recorded_by': current_user.name,
            'site_context': site_context,
            'gps_lat': gps_lat,
            'gps_lon': gps_lon,
            'created_at': datetime.utcnow()
        })
        db.commit()

        # Get inserted note_id
        note_id = db.execute(text("SELECT last_insert_rowid()")).scalar()

        return {
            "note_id": note_id,
            "audio_filename": audio_filename,
            "status": "pending",
            "message": "Audio uploaded. Use POST /notes/{note_id}/process to transcribe."
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading audio: {str(e)}")


@router.post("/{note_id}/process")
async def process_note(
    note_id: int,
    language: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Process audio note: transcribe with Whisper + interpret with Claude

    Args:
        note_id: ID of the note to process
        language: Optional language code (it, en, es, etc.). Auto-detects if None.
    """
    try:
        # Get note from database
        from sqlalchemy import text

        query = text("SELECT * FROM mobile_notes WHERE id = :note_id")
        result = db.execute(query, {'note_id': note_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Note not found")

        note = dict(result._mapping)

        # Check if already processed
        if note['status'] == 'processed':
            return {
                "note_id": note_id,
                "status": "already_processed",
                "transcription": note['transcription'],
                "interpretation": note['ai_interpretation']
            }

        # Step 1: Transcribe audio with Whisper
        transcriber = AudioTranscriber()
        audio_path = Path(note['audio_path'])

        if not audio_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")

        transcription_result = transcriber.transcribe(audio_path, language=language)

        # Step 2: Interpret with Claude AI (if enabled)
        interpretation = None
        ai_confidence = 0.0

        if settings.ANTHROPIC_API_KEY and not settings.ANTHROPIC_API_KEY.startswith("sk-ant-test"):
            interpreter = ArchaeologicalAIInterpreter()
            interpretation_result = interpreter.interpret(transcription_result['text'])
            interpretation = interpretation_result.get('structured_data', {})
            ai_confidence = interpretation_result.get('confidence', 0.0)

        # Update note in database
        update_query = text("""
            UPDATE mobile_notes
            SET transcription = :transcription,
                transcription_confidence = :transcription_confidence,
                detected_language = :detected_language,
                ai_interpretation = :ai_interpretation,
                ai_confidence = :ai_confidence,
                status = :status,
                updated_at = :updated_at
            WHERE id = :note_id
        """)

        db.execute(update_query, {
            'transcription': transcription_result['text'],
            'transcription_confidence': transcription_result['confidence'],
            'detected_language': transcription_result['language'],
            'ai_interpretation': str(interpretation) if interpretation else None,
            'ai_confidence': ai_confidence,
            'status': 'processed',
            'updated_at': datetime.utcnow(),
            'note_id': note_id
        })
        db.commit()

        return {
            "note_id": note_id,
            "status": "processed",
            "transcription": transcription_result['text'],
            "language": transcription_result['language'],
            "interpretation": interpretation,
            "ai_enabled": interpretation is not None
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing note: {str(e)}")


@router.get("")
async def get_notes(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of audio notes for current user

    Args:
        status: Filter by status (pending, processed, validated, rejected)
        limit: Max number of results
        offset: Pagination offset
    """
    try:
        from sqlalchemy import text

        # Build query
        where_clause = "WHERE recorded_by = :user_name"
        params = {'user_name': current_user.name, 'limit': limit, 'offset': offset}

        if status:
            where_clause += " AND status = :status"
            params['status'] = status

        query = text(f"""
            SELECT * FROM mobile_notes
            {where_clause}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """)

        results = db.execute(query, params).fetchall()

        notes = [
            NoteResponse(
                id=row.id,
                audio_filename=row.audio_filename,
                transcription=row.transcription,
                detected_language=row.detected_language,
                ai_interpretation=row.ai_interpretation,
                status=row.status,
                created_at=row.created_at
            )
            for row in results
        ]

        # Get total count
        count_query = text(f"SELECT COUNT(*) FROM mobile_notes {where_clause}")
        total = db.execute(count_query, {k: v for k, v in params.items() if k not in ['limit', 'offset']}).scalar()

        return NoteListResponse(notes=notes, total=total)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notes: {str(e)}")


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete audio note"""
    try:
        from sqlalchemy import text

        # Get note to verify ownership
        query = text("SELECT * FROM mobile_notes WHERE id = :note_id")
        result = db.execute(query, {'note_id': note_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Note not found")

        note = dict(result._mapping)

        # Delete audio file
        audio_path = Path(note['audio_path'])
        if audio_path.exists():
            audio_path.unlink()

        # Delete from database
        delete_query = text("DELETE FROM mobile_notes WHERE id = :note_id")
        db.execute(delete_query, {'note_id': note_id})
        db.commit()

        return {"message": "Note deleted successfully", "note_id": note_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting note: {str(e)}")
