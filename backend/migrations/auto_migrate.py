"""
Automatic database migrations - runs on application startup
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


def migrate_users_table(engine):
    """
    Migrate users table to add missing columns
    """
    logger.info("Checking users table for missing columns...")

    # Check if users table exists
    inspector = inspect(engine)
    if 'users' not in inspector.get_table_names():
        logger.info("Users table doesn't exist yet, skipping migration")
        return

    # Add missing columns
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
        add_column_if_missing(engine, 'users', column_name, column_def)


def run_auto_migrations(engine):
    """
    Run all automatic migrations

    This function is called on application startup and automatically
    adds any missing columns to existing tables.
    """
    logger.info("Running automatic database migrations...")

    try:
        # Migrate users table
        migrate_users_table(engine)

        logger.info("✅ Automatic migrations completed successfully")

    except Exception as e:
        logger.error(f"❌ Automatic migrations failed: {e}")
        # Don't raise - allow app to start even if migrations fail
        # The error will be logged and the app may fail later with more specific errors
