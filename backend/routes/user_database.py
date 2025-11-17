"""
User Database Management Routes
Endpoints for managing user's personal database configuration
"""

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from backend.services.auth_service import get_current_user
from backend.models.auth import User
from backend.services.db_manager import get_db
from backend.services.user_database_manager import UserDatabaseManager

router = APIRouter(prefix="/api/database", tags=["database"])


# Pydantic models
class DatabaseConfigResponse(BaseModel):
    db_mode: str
    sqlite_filename: Optional[str] = None
    postgres_host: Optional[str] = None
    postgres_port: Optional[int] = None
    postgres_name: Optional[str] = None
    postgres_user: Optional[str] = None


class DatabaseConfigUpdate(BaseModel):
    db_mode: str  # sqlite | postgres_personal | postgres_hybrid
    # PostgreSQL personal config (optional)
    postgres_host: Optional[str] = None
    postgres_port: Optional[int] = None
    postgres_name: Optional[str] = None
    postgres_user: Optional[str] = None
    postgres_password: Optional[str] = None  # Will be encrypted


@router.get("/config", response_model=DatabaseConfigResponse)
async def get_database_config(
    current_user: User = Depends(get_current_user)
):
    """Get current user's database configuration"""
    return DatabaseConfigResponse(
        db_mode=current_user.db_mode or "sqlite",
        sqlite_filename=current_user.sqlite_filename,
        postgres_host=current_user.postgres_host,
        postgres_port=current_user.postgres_port,
        postgres_name=current_user.postgres_name,
        postgres_user=current_user.postgres_user
    )


@router.put("/config")
async def update_database_config(
    config: DatabaseConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's database configuration"""

    # Update db_mode
    current_user.db_mode = config.db_mode

    if config.db_mode == "postgres_personal":
        # Validate PostgreSQL config
        if not all([config.postgres_host, config.postgres_name, config.postgres_user, config.postgres_password]):
            raise HTTPException(
                status_code=400,
                detail="PostgreSQL configuration incomplete. Required: host, name, user, password"
            )

        # Encrypt and save PostgreSQL credentials
        current_user.postgres_host = config.postgres_host
        current_user.postgres_port = config.postgres_port or 5432
        current_user.postgres_name = config.postgres_name
        current_user.postgres_user = config.postgres_user
        current_user.postgres_password_encrypted = UserDatabaseManager.encrypt_password(config.postgres_password)

        # Test connection
        try:
            engine = UserDatabaseManager.create_user_engine(current_user)
            with engine.connect() as conn:
                conn.execute("SELECT 1")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to connect to PostgreSQL: {str(e)}"
            )

    elif config.db_mode == "sqlite":
        # Initialize default SQLite database if not exists
        if not current_user.sqlite_filename:
            current_user.sqlite_filename = f"pyarchinit_user_{current_user.id}.sqlite"
            UserDatabaseManager.initialize_user_database(current_user)

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Database configuration updated successfully",
        "db_mode": current_user.db_mode
    }


@router.post("/upload-sqlite")
async def upload_sqlite_database(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload SQLite database file"""

    if current_user.db_mode != "sqlite":
        raise HTTPException(
            status_code=400,
            detail="Can only upload SQLite files when db_mode is 'sqlite'"
        )

    # Validate file type
    if not file.filename.endswith(('.sqlite', '.db', '.sqlite3')):
        raise HTTPException(
            status_code=400,
            detail="File must be a SQLite database (.sqlite, .db, or .sqlite3)"
        )

    # Read file content
    content = await file.read()

    # Validate it's a SQLite file (check magic number)
    if not content.startswith(b'SQLite format 3'):
        raise HTTPException(
            status_code=400,
            detail="File is not a valid SQLite database"
        )

    # Save file
    db_path = UserDatabaseManager.save_uploaded_database(
        user_id=current_user.id,
        file_content=content,
        filename=file.filename
    )

    # Update user's sqlite_filename
    current_user.sqlite_filename = db_path.name
    db.commit()

    return {
        "message": "Database uploaded successfully",
        "filename": db_path.name,
        "size_bytes": len(content)
    }


@router.get("/download-sqlite")
async def download_sqlite_database(
    current_user: User = Depends(get_current_user)
):
    """Download user's SQLite database"""

    if current_user.db_mode != "sqlite":
        raise HTTPException(
            status_code=400,
            detail="Can only download SQLite files when db_mode is 'sqlite'"
        )

    file_info = UserDatabaseManager.get_database_file(current_user)

    if not file_info:
        raise HTTPException(
            status_code=404,
            detail="No database file found for this user"
        )

    db_path, filename = file_info

    return FileResponse(
        path=str(db_path),
        filename=filename,
        media_type="application/x-sqlite3",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.post("/initialize")
async def initialize_database(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize database tables for current user"""

    try:
        UserDatabaseManager.initialize_user_database(current_user)

        # Set default filename if SQLite mode
        if current_user.db_mode == "sqlite" and not current_user.sqlite_filename:
            current_user.sqlite_filename = f"pyarchinit_user_{current_user.id}.sqlite"
            db.commit()

        return {
            "message": "Database initialized successfully",
            "db_mode": current_user.db_mode
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize database: {str(e)}"
        )


@router.get("/info")
async def get_database_info(
    current_user: User = Depends(get_current_user)
):
    """Get information about user's database"""

    info = {
        "db_mode": current_user.db_mode,
        "user_id": current_user.id
    }

    if current_user.db_mode == "sqlite":
        db_path = UserDatabaseManager.get_user_database_path(current_user)
        if db_path and db_path.exists():
            import os
            info["sqlite_file"] = db_path.name
            info["size_bytes"] = os.path.getsize(db_path)
            info["size_mb"] = round(os.path.getsize(db_path) / (1024 * 1024), 2)
        else:
            info["sqlite_file"] = None
            info["size_bytes"] = 0

    elif current_user.db_mode == "postgres_personal":
        info["postgres_host"] = current_user.postgres_host
        info["postgres_port"] = current_user.postgres_port
        info["postgres_database"] = current_user.postgres_name

    return info
