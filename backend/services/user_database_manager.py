"""
User Database Manager - Handle per-user database connections

Supports three modes:
1. SQLite: Personal SQLite database (upload/download)
2. PostgreSQL Personal: User's own PostgreSQL server
3. PostgreSQL Hybrid: Shared PostgreSQL with RLS
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pathlib import Path
from cryptography.fernet import Fernet
from typing import Optional, Tuple
import os
import shutil

from backend.config import settings
from backend.models.auth import User


class UserDatabaseManager:
    """Manage per-user database connections"""

    # Encryption key for PostgreSQL passwords (store in environment variable!)
    @classmethod
    def _get_encryption_key(cls):
        """Get or generate encryption key"""
        key = os.getenv("DB_PASSWORD_ENCRYPTION_KEY")
        if key:
            # If key is provided as string, encode it
            return key.encode() if isinstance(key, str) else key
        else:
            # Generate a new key if not provided (WARNING: will be different each restart!)
            return Fernet.generate_key()

    ENCRYPTION_KEY = _get_encryption_key.__func__(None)
    cipher = Fernet(ENCRYPTION_KEY)

    # Base directory for user SQLite databases
    SQLITE_BASE_DIR = Path("/data/user_databases")  # Railway Volume mount point

    @classmethod
    def ensure_user_db_directory(cls, user_id: int) -> Path:
        """Ensure user's database directory exists"""
        user_dir = cls.SQLITE_BASE_DIR / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    @classmethod
    def encrypt_password(cls, password: str) -> str:
        """Encrypt PostgreSQL password"""
        return cls.cipher.encrypt(password.encode()).decode()

    @classmethod
    def decrypt_password(cls, encrypted_password: str) -> str:
        """Decrypt PostgreSQL password"""
        return cls.cipher.decrypt(encrypted_password.encode()).decode()

    @classmethod
    def get_user_database_path(cls, user: User) -> Optional[Path]:
        """Get full path to user's SQLite database"""
        if user.db_mode != "sqlite" or not user.sqlite_filename:
            return None

        user_dir = cls.ensure_user_db_directory(user.id)
        return user_dir / user.sqlite_filename

    @classmethod
    def create_user_engine(cls, user: User):
        """Create SQLAlchemy engine for user's database"""

        if user.db_mode == "sqlite":
            # SQLite mode
            db_path = cls.get_user_database_path(user)
            if not db_path:
                # Create default database for user
                user_dir = cls.ensure_user_db_directory(user.id)
                db_path = user_dir / f"pyarchinit_user_{user.id}.sqlite"

            database_url = f"sqlite:///{db_path}"
            engine = create_engine(database_url, connect_args={"check_same_thread": False})

        elif user.db_mode == "postgres_personal":
            # PostgreSQL Personal mode
            if not all([user.postgres_host, user.postgres_name, user.postgres_user, user.postgres_password_encrypted]):
                raise ValueError("PostgreSQL configuration incomplete for user")

            password = cls.decrypt_password(user.postgres_password_encrypted)
            port = user.postgres_port or 5432

            database_url = f"postgresql://{user.postgres_user}:{password}@{user.postgres_host}:{port}/{user.postgres_name}"
            engine = create_engine(database_url)

        elif user.db_mode == "postgres_hybrid":
            # PostgreSQL Hybrid mode (shared database with RLS)
            database_url = f"postgresql://{settings.PYARCHINIT_DB_USER}:{settings.PYARCHINIT_DB_PASSWORD}@{settings.PYARCHINIT_DB_HOST}:{settings.PYARCHINIT_DB_PORT}/{settings.PYARCHINIT_DB_NAME}"
            engine = create_engine(database_url)

        else:
            raise ValueError(f"Unknown db_mode: {user.db_mode}")

        return engine

    @classmethod
    def get_user_session(cls, user: User) -> Session:
        """Get database session for user"""
        engine = cls.create_user_engine(user)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()

    @classmethod
    def save_uploaded_database(cls, user_id: int, file_content: bytes, filename: str) -> Path:
        """Save uploaded SQLite database for user"""
        user_dir = cls.ensure_user_db_directory(user_id)

        # Sanitize filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ('_', '.', '-'))
        if not safe_filename.endswith('.sqlite') and not safe_filename.endswith('.db'):
            safe_filename += '.sqlite'

        db_path = user_dir / safe_filename

        # Save file
        with open(db_path, 'wb') as f:
            f.write(file_content)

        return db_path

    @classmethod
    def get_database_file(cls, user: User) -> Optional[Tuple[Path, str]]:
        """Get user's SQLite database file for download

        Returns:
            Tuple of (file_path, filename) or None
        """
        if user.db_mode != "sqlite":
            return None

        db_path = cls.get_user_database_path(user)
        if not db_path or not db_path.exists():
            return None

        return (db_path, db_path.name)

    @classmethod
    def initialize_user_database(cls, user: User):
        """Initialize database tables for new user database"""
        from backend.models.database import Base

        engine = cls.create_user_engine(user)
        Base.metadata.create_all(bind=engine)

        print(f"[UserDatabaseManager] Initialized database for user {user.id} (mode: {user.db_mode})")
