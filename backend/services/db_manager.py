"""
Database Manager - Supports Multiple Database Modes
Handles connections for:
- Separate Mode: Each user has their own PostgreSQL database
- Hybrid Mode: Single PostgreSQL with Row-Level Security
- SQLite Mode: Local development

Usage:
    from services.db_manager import get_db, create_user_database

    # Get database session for current user
    db = get_db(user_id=user.id)

    # Create new database for user (separate mode)
    create_user_database(user_id=123)
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from contextlib import contextmanager
from typing import Generator, Optional
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

from config import settings


class DatabaseManager:
    """Manages database connections based on DB_MODE"""

    def __init__(self):
        self.mode = settings.DB_MODE
        self.engines = {}  # Cache engines per user in separate mode

    def get_database_url(self, user_id: Optional[int] = None) -> str:
        """
        Get database URL based on mode and user

        Args:
            user_id: User ID (required for separate mode)

        Returns:
            Database connection URL
        """
        if self.mode == "sqlite" or settings.USE_SQLITE:
            # SQLite mode
            if settings.SQLITE_DB_PATH:
                db_path = settings.SQLITE_DB_PATH
            else:
                # Use /tmp for Railway and other read-only filesystems
                db_path = "/tmp/pyarchinit_db.sqlite"
            return f"sqlite:///{db_path}"

        elif self.mode == "separate":
            # Separate mode: each user has their own database
            if user_id is None:
                raise ValueError("user_id is required for separate mode")

            db_name = f"{settings.SEPARATE_DB_NAME_TEMPLATE}_{user_id}"
            return (
                f"postgresql://{settings.PYARCHINIT_DB_USER}:"
                f"{settings.PYARCHINIT_DB_PASSWORD}@"
                f"{settings.PYARCHINIT_DB_HOST}:"
                f"{settings.PYARCHINIT_DB_PORT}/{db_name}"
            )

        elif self.mode == "hybrid":
            # Hybrid mode: single database with RLS
            return (
                f"postgresql://{settings.PYARCHINIT_DB_USER}:"
                f"{settings.PYARCHINIT_DB_PASSWORD}@"
                f"{settings.PYARCHINIT_DB_HOST}:"
                f"{settings.PYARCHINIT_DB_PORT}/"
                f"{settings.PYARCHINIT_DB_NAME}"
            )

        else:
            raise ValueError(f"Invalid DB_MODE: {self.mode}")

    def get_engine(self, user_id: Optional[int] = None):
        """
        Get SQLAlchemy engine for user

        Args:
            user_id: User ID

        Returns:
            SQLAlchemy Engine
        """
        # For separate mode, cache engines per user
        if self.mode == "separate" and user_id:
            if user_id not in self.engines:
                url = self.get_database_url(user_id)
                self.engines[user_id] = create_engine(
                    url,
                    pool_pre_ping=True,
                    echo=False
                )
            return self.engines[user_id]

        # For hybrid and sqlite, use single engine
        if not hasattr(self, '_engine'):
            url = self.get_database_url(user_id)

            if "sqlite" in url:
                # SQLite specific settings
                self._engine = create_engine(
                    url,
                    connect_args={"check_same_thread": False},
                    poolclass=StaticPool,
                    echo=False
                )
            else:
                # PostgreSQL settings
                self._engine = create_engine(
                    url,
                    pool_pre_ping=True,
                    pool_size=10,
                    max_overflow=20,
                    echo=False
                )

        return self._engine

    def get_session(self, user_id: Optional[int] = None) -> Session:
        """
        Get database session for user

        Args:
            user_id: User ID

        Returns:
            SQLAlchemy Session
        """
        engine = self.get_engine(user_id)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()

        # Set Row-Level Security context for hybrid mode
        if self.mode == "hybrid" and user_id:
            session.execute(text(f"SET app.current_user_id = {user_id}"))

        return session

    def create_user_database(self, user_id: int) -> bool:
        """
        Create new database for user (separate mode only)

        Args:
            user_id: User ID

        Returns:
            True if successful
        """
        if self.mode != "separate":
            print(f"create_user_database only works in separate mode (current: {self.mode})")
            return False

        db_name = f"{settings.SEPARATE_DB_NAME_TEMPLATE}_{user_id}"

        try:
            # Connect to PostgreSQL server (not specific database)
            conn = psycopg2.connect(
                host=settings.PYARCHINIT_DB_HOST,
                port=settings.PYARCHINIT_DB_PORT,
                user=settings.PYARCHINIT_DB_USER,
                password=settings.PYARCHINIT_DB_PASSWORD,
                database="postgres"  # Connect to default postgres database
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()

            # Check if database exists
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (db_name,)
            )

            if cursor.fetchone():
                print(f"Database {db_name} already exists")
                cursor.close()
                conn.close()
                return True

            # Create database
            cursor.execute(f'CREATE DATABASE "{db_name}"')
            print(f"Created database: {db_name}")

            cursor.close()
            conn.close()

            # Run migrations on new database
            self._init_user_database_schema(user_id)

            return True

        except Exception as e:
            print(f"Error creating database for user {user_id}: {e}")
            return False

    def _init_user_database_schema(self, user_id: int):
        """
        Initialize schema for user database (separate mode)

        Args:
            user_id: User ID
        """
        # Get engine for user database
        engine = self.get_engine(user_id)

        # Import models and create tables
        from models import database as models
        models.Base.metadata.create_all(bind=engine)

        print(f"Initialized schema for user {user_id}")

    def drop_user_database(self, user_id: int) -> bool:
        """
        Drop user database (separate mode only) - USE WITH CAUTION

        Args:
            user_id: User ID

        Returns:
            True if successful
        """
        if self.mode != "separate":
            print(f"drop_user_database only works in separate mode")
            return False

        db_name = f"{settings.SEPARATE_DB_NAME_TEMPLATE}_{user_id}"

        try:
            # Close all connections to this database first
            if user_id in self.engines:
                self.engines[user_id].dispose()
                del self.engines[user_id]

            # Connect to PostgreSQL server
            conn = psycopg2.connect(
                host=settings.PYARCHINIT_DB_HOST,
                port=settings.PYARCHINIT_DB_PORT,
                user=settings.PYARCHINIT_DB_USER,
                password=settings.PYARCHINIT_DB_PASSWORD,
                database="postgres"
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()

            # Terminate all connections to database
            cursor.execute(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{db_name}'
                AND pid <> pg_backend_pid()
            """)

            # Drop database
            cursor.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
            print(f"Dropped database: {db_name}")

            cursor.close()
            conn.close()

            return True

        except Exception as e:
            print(f"Error dropping database for user {user_id}: {e}")
            return False


# Global database manager instance
db_manager = DatabaseManager()


# Dependency for FastAPI
def get_db(user_id: Optional[int] = None) -> Generator[Session, None, None]:
    """
    FastAPI dependency to get database session

    Usage:
        @app.get("/endpoint")
        def endpoint(db: Session = Depends(get_db)):
            ...

    Args:
        user_id: User ID (will be injected from auth)

    Yields:
        Database session
    """
    session = db_manager.get_session(user_id)
    try:
        yield session
    finally:
        session.close()


# Utility functions
def create_user_database(user_id: int) -> bool:
    """Create database for user (separate mode only)"""
    return db_manager.create_user_database(user_id)


def drop_user_database(user_id: int) -> bool:
    """Drop user database (separate mode only)"""
    return db_manager.drop_user_database(user_id)


def get_db_mode() -> str:
    """Get current database mode"""
    return db_manager.mode


# ============================================================================
# AUTH DATABASE (Separate from PyArchInit Data)
# ============================================================================
# Auth database is ALWAYS SQLite and stores users, sessions, user_databases


def get_auth_engine():
    """
    Get SQLAlchemy engine for auth database (ALWAYS SQLite)

    Returns:
        SQLAlchemy Engine for auth database
    """
    # Cache auth engine as singleton
    if not hasattr(get_auth_engine, '_auth_engine'):
        auth_db_url = f"sqlite:///{settings.AUTH_DB_PATH}"

        get_auth_engine._auth_engine = create_engine(
            auth_db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            echo=False
        )

    return get_auth_engine._auth_engine


def get_auth_session() -> Session:
    """
    Get database session for auth database

    Returns:
        SQLAlchemy Session for auth database
    """
    engine = get_auth_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def get_auth_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency to get auth database session

    This is used for all authentication operations (login, register, etc.)
    and is completely separate from PyArchInit data database.

    Usage:
        @app.post("/api/auth/register")
        def register(db: Session = Depends(get_auth_db)):
            # db is now connected to auth database
            user = User(email=..., password_hash=...)
            db.add(user)
            db.commit()

    Yields:
        Auth database session
    """
    session = get_auth_session()
    try:
        yield session
    finally:
        session.close()


def get_engine(user_id: Optional[int] = None):
    """
    DEPRECATED: Use db_manager.get_engine() directly for PyArchInit database.
    This function is kept for backward compatibility.

    For auth database, use get_auth_engine() instead.
    """
    return db_manager.get_engine(user_id)
