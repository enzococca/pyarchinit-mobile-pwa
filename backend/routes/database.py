"""
Database configuration routes
Handles SQLite file upload and database configuration
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import shutil
import os

from backend.services.auth_service import get_current_user
from backend.models.auth import User
from backend.services.db_manager import get_db
from backend.config import settings

router = APIRouter(prefix="/api/database", tags=["database"])


class DatabaseConfig(BaseModel):
    mode: str  # "sqlite" | "postgresql"
    config: Optional[dict] = None  # PostgreSQL config if mode is "postgresql"


@router.post("/upload-sqlite")
async def upload_sqlite(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a SQLite database file to replace the current database
    """
    try:
        # Validate file extension
        if not (file.filename.endswith('.sqlite') or file.filename.endswith('.db')):
            raise HTTPException(status_code=400, detail="File must be .sqlite or .db")

        # Define target path
        db_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..',
            'pyarchinit_db.sqlite'
        )

        # Save uploaded file
        with open(db_path, 'wb') as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {
            "message": "Database SQLite caricato con successo",
            "filename": file.filename,
            "path": db_path
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante il caricamento: {str(e)}")


@router.post("/test-connection")
async def test_connection(
    config: DatabaseConfig,
    current_user: User = Depends(get_current_user)
):
    """
    Test database connection with provided configuration
    """
    try:
        if config.mode == "sqlite":
            # Test SQLite connection
            db_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                '..',
                'pyarchinit_db.sqlite'
            )
            if os.path.exists(db_path):
                return {"message": "Connessione SQLite riuscita", "mode": "sqlite"}
            else:
                raise HTTPException(status_code=404, detail="Database SQLite non trovato")

        elif config.mode == "postgresql":
            # Test PostgreSQL connection (not implemented yet)
            raise HTTPException(status_code=501, detail="PostgreSQL non ancora implementato")

        else:
            raise HTTPException(status_code=400, detail="Modalità database non valida")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore di connessione: {str(e)}")


@router.post("/configure")
async def configure_database(
    config: DatabaseConfig,
    current_user: User = Depends(get_current_user)
):
    """
    Save database configuration
    Note: This endpoint currently only confirms the mode, as the database
    is already configured in config.py
    """
    try:
        # For now, we just confirm the mode
        # In a full implementation, this would update config files
        return {
            "message": "Configurazione salvata",
            "mode": config.mode,
            "note": "Riavviare l'applicazione per applicare le modifiche"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante la configurazione: {str(e)}")


@router.get("/download-sqlite")
async def download_sqlite(
    current_user: User = Depends(get_current_user)
):
    """
    Download the current SQLite database file
    """
    try:
        db_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..',
            'pyarchinit_db.sqlite'
        )

        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Database SQLite non trovato")

        return FileResponse(
            path=db_path,
            filename="pyarchinit_db.sqlite",
            media_type="application/x-sqlite3"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante il download: {str(e)}")
