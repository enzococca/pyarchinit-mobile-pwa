"""
Automatic database migrations - runs on application startup

IMPORTANT: This now handles TWO separate databases:
1. Auth Database (auth.db) - User accounts, webapp-level authentication
2. PyArchInit Database - Archaeological data (SQLite or PostgreSQL)

The auth database and PyArchInit database are completely separate and
require separate migration logic.
"""

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError
import logging

logger = logging.getLogger(__name__)


def check_column_exists(engine, table_name: str, column_name: str) -> bool:
    """
    Check if a column exists in a table

    Args:
        engine: SQLAlchemy engine
        table_name: Name of the table
        column_name: Name of the column

    Returns:
        True if column exists, False otherwise
    """
    inspector = inspect(engine)

    try:
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        return column_name in columns
    except Exception as e:
        logger.warning(f"Could not check column {column_name} in {table_name}: {e}")
        return False


def add_column_if_missing(engine, table_name: str, column_name: str, column_def: str):
    """
    Add a column to a table if it doesn't exist

    Args:
        engine: SQLAlchemy engine
        table_name: Name of the table
        column_name: Name of the column to add
        column_def: SQL column definition (e.g., "VARCHAR(50) DEFAULT 'approved'")
    """
    if check_column_exists(engine, table_name, column_name):
        logger.info(f"Column {table_name}.{column_name} already exists")
        return

    try:
        with engine.connect() as conn:
            # Determine database type
            db_type = engine.dialect.name

            if db_type == 'sqlite':
                # SQLite syntax
                sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}"
            else:
                # PostgreSQL syntax
                sql = f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}"

            conn.execute(text(sql))
            conn.commit()
            logger.info(f"✅ Added column {table_name}.{column_name}")

    except Exception as e:
        logger.error(f"❌ Failed to add column {table_name}.{column_name}: {e}")
        raise


def migrate_auth_database(auth_engine):
    """
    Migrate auth database tables (users, user_databases, etc.)

    The auth database is webapp-level and completely separate from
    PyArchInit archaeological data.

    Args:
        auth_engine: SQLAlchemy engine for auth database (always SQLite)
    """
    logger.info("🔐 Checking auth database for missing columns...")

    # Check if users table exists
    inspector = inspect(auth_engine)
    if 'users' not in inspector.get_table_names():
        logger.info("Users table doesn't exist yet, skipping auth migration")
        return

    # Add missing columns to users table
    columns_to_add = [
        ('approval_status', "VARCHAR(50) DEFAULT 'approved'"),
        ('db_mode', "VARCHAR(50) DEFAULT 'sqlite'"),
        ('pg_host', "VARCHAR(255)"),
        ('pg_port', "INTEGER"),
        ('pg_database', "VARCHAR(255)"),
        ('pg_user', "VARCHAR(255)"),
        ('pg_password', "VARCHAR(255)"),
        ('sqlite_db_path', "VARCHAR(500)"),
    ]

    for column_name, column_def in columns_to_add:
        add_column_if_missing(auth_engine, 'users', column_name, column_def)

    logger.info("✅ Auth database migration complete")


def create_table_if_missing(engine, table_name: str, create_sql: str):
    """
    Create a table if it doesn't exist

    Args:
        engine: SQLAlchemy engine
        table_name: Name of the table
        create_sql: SQL CREATE TABLE statement
    """
    inspector = inspect(engine)

    if table_name in inspector.get_table_names():
        logger.info(f"Table {table_name} already exists")
        return

    try:
        with engine.connect() as conn:
            conn.execute(text(create_sql))
            conn.commit()
            logger.info(f"✅ Created table {table_name}")
    except Exception as e:
        logger.error(f"❌ Failed to create table {table_name}: {e}")
        raise


def migrate_pyarchinit_database(pyarchinit_engine):
    """
    Migrate PyArchInit database tables (archaeological data)

    This database contains only archaeological data (sites, US, media, etc.)
    and NO user/auth tables.

    Args:
        pyarchinit_engine: SQLAlchemy engine for PyArchInit database
    """
    logger.info("🏛️  Checking PyArchInit database for missing columns...")

    # Create image_annotations table for Tropy-style annotations
    create_table_if_missing(
        pyarchinit_engine,
        'image_annotations',
        """
        CREATE TABLE image_annotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_id INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            width REAL NOT NULL,
            height REAL NOT NULL,
            note TEXT,
            color VARCHAR(20) DEFAULT '#ff0000',
            user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (media_id) REFERENCES media_table(id_media)
        )
        """
    )

    logger.info("✅ PyArchInit database migration complete")


def run_auto_migrations(auth_engine=None, pyarchinit_engine=None):
    """
    Run all automatic migrations for BOTH databases

    This function is called on application startup and automatically
    adds any missing columns to existing tables in both databases.

    Args:
        auth_engine: SQLAlchemy engine for auth database (optional)
        pyarchinit_engine: SQLAlchemy engine for PyArchInit database (optional)
    """
    logger.info("=" * 60)
    logger.info("🔧 Running automatic database migrations...")
    logger.info("=" * 60)

    try:
        # Migrate auth database (users, user_databases, etc.)
        if auth_engine:
            migrate_auth_database(auth_engine)
        else:
            logger.warning("⚠️  Auth engine not provided, skipping auth migrations")

        # Migrate PyArchInit database (archaeological data)
        if pyarchinit_engine:
            migrate_pyarchinit_database(pyarchinit_engine)
        else:
            logger.warning("⚠️  PyArchInit engine not provided, skipping PyArchInit migrations")

        logger.info("=" * 60)
        logger.info("✅ All automatic migrations completed successfully")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"❌ Automatic migrations failed: {e}")
        # Don't raise - allow app to start even if migrations fail
        # The error will be logged and the app may fail later with more specific errors
