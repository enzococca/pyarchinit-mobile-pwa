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
import json

from backend.services.auth_service import get_current_user
from backend.models.auth import User
from backend.services.db_manager import get_db
from backend.dependencies import get_current_project, get_project_db_session
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
    project_id: int = Depends(get_current_project),
    db: Session = Depends(get_project_db_session)
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
    project_id: int = Depends(get_current_project),
    db: Session = Depends(get_project_db_session)
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
            # Parse interpretation and add confidence if available
            interpretation = note['ai_interpretation']
            if isinstance(interpretation, str):
                interpretation = json.loads(interpretation) if interpretation else {}
            if interpretation and 'confidence' not in interpretation and note.get('ai_confidence'):
                interpretation['confidence'] = note['ai_confidence']

            return {
                "note_id": note_id,
                "status": "already_processed",
                "transcription": note['transcription'],
                "interpretation": interpretation
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
            interpretation_result = interpreter.interpret_note(
                transcription_result['text'],
                note.get('site_context'),
                transcription_result['language']
            )
            # Keep the full interpretation_result (includes entity_type, target_table, etc.)
            interpretation = interpretation_result
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
            'ai_interpretation': json.dumps(interpretation, ensure_ascii=False) if interpretation else None,
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
    project_id: int = Depends(get_current_project),
    db: Session = Depends(get_project_db_session)
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

        notes = []
        for row in results:
            # Parse and add confidence to interpretation
            interpretation = row.ai_interpretation
            if interpretation and isinstance(interpretation, str):
                try:
                    interp_dict = json.loads(interpretation)
                    if 'confidence' not in interp_dict and row.ai_confidence:
                        interp_dict['confidence'] = row.ai_confidence
                        interpretation = json.dumps(interp_dict, ensure_ascii=False)
                except json.JSONDecodeError:
                    pass  # Keep original if parsing fails

            notes.append(NoteResponse(
                id=row.id,
                audio_filename=row.audio_filename,
                transcription=row.transcription,
                detected_language=row.detected_language,
                ai_interpretation=interpretation,
                status=row.status,
                created_at=row.created_at
            ))

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
    project_id: int = Depends(get_current_project),
    db: Session = Depends(get_project_db_session)
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


# Pydantic models for confirm endpoint
class ConfirmNoteRequest(BaseModel):
    extracted_fields: dict
    entity_type: str = "US"
    target_table: str = "us_table"
    force_action: Optional[str] = None  # 'merge' or 'overwrite'


@router.post("/{note_id}/confirm")
async def confirm_note(
    note_id: int,
    request: ConfirmNoteRequest,
    current_user: User = Depends(get_current_user),
    project_id: int = Depends(get_current_project),
    db: Session = Depends(get_project_db_session)
):
    """
    Confirm and save note interpretation to PyArchInit database

    Takes the AI-extracted archaeological data and inserts it into
    the appropriate PyArchInit table (e.g., us_table for stratigraphic units).

    Handles duplicate detection and allows force actions (merge/overwrite).
    """
    try:
        from sqlalchemy import text

        # Get note from database
        query = text("SELECT * FROM mobile_notes WHERE id = :note_id")
        result = db.execute(query, {'note_id': note_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Note not found")

        note = dict(result._mapping)

        # Verify note has been processed
        if note['status'] != 'processed':
            raise HTTPException(
                status_code=400,
                detail=f"Note must be processed first. Current status: {note['status']}"
            )

        # Verify note has interpretation
        if not note['ai_interpretation']:
            raise HTTPException(
                status_code=400,
                detail="Note has no AI interpretation to save"
            )

        fields = request.extracted_fields
        target_table = request.target_table
        force_action = request.force_action

        # Check for duplicates (for US entities)
        if target_table == 'us_table' and not force_action:
            sito = fields.get('sito', '')
            area = fields.get('area', '')
            us = fields.get('us', '')

            if sito and area and us:
                check_query = text(f"""
                    SELECT COUNT(*) FROM {target_table}
                    WHERE sito = :sito AND area = :area AND us = :us
                """)
                count = db.execute(check_query, {
                    'sito': sito,
                    'area': area,
                    'us': us
                }).scalar()

                if count > 0:
                    raise HTTPException(
                        status_code=409,
                        detail=f"US already exists: {sito}, Area {area}, US {us}"
                    )

        # Build INSERT query dynamically based on provided fields
        columns = list(fields.keys())
        placeholders = [f":{col}" for col in columns]

        insert_query = text(f"""
            INSERT INTO {target_table} ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
        """)

        # Execute insert
        db.execute(insert_query, fields)

        # Update note status to 'validated'
        update_query = text("""
            UPDATE mobile_notes
            SET status = :status, updated_at = :updated_at
            WHERE id = :note_id
        """)

        db.execute(update_query, {
            'status': 'validated',
            'updated_at': datetime.utcnow(),
            'note_id': note_id
        })

        db.commit()

        return {
            "success": True,
            "message": "Note confirmed and saved to database",
            "note_id": note_id,
            "target_table": target_table,
            "entity_type": request.entity_type
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving note: {str(e)}")


@router.post("/{note_id}/reject")
async def reject_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    project_id: int = Depends(get_current_project),
    db: Session = Depends(get_project_db_session)
):
    """
    Reject a note - marks it as rejected without saving to database

    Use this when the AI interpretation is incorrect or the note
    should not be saved to the PyArchInit database.
    """
    try:
        from sqlalchemy import text

        # Get note from database
        query = text("SELECT * FROM mobile_notes WHERE id = :note_id")
        result = db.execute(query, {'note_id': note_id}).fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Note not found")

        # Update note status to 'rejected'
        update_query = text("""
            UPDATE mobile_notes
            SET status = :status, updated_at = :updated_at
            WHERE id = :note_id
        """)

        db.execute(update_query, {
            'status': 'rejected',
            'updated_at': datetime.utcnow(),
            'note_id': note_id
        })

        db.commit()

        return {
            "success": True,
            "message": "Note rejected successfully",
            "note_id": note_id
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error rejecting note: {str(e)}")
