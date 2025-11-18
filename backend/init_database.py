#!/usr/bin/env python3
"""
Database initialization script - Creates all tables with proper schema
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from backend.config import settings
from backend.models.auth import Base
from backend.models.database import Base as DBBase


def init_database():
    """
    Initialize database with proper schema
    Recreates all tables from models
    """
    # Get database URL
    if settings.USE_SQLITE:
        db_url = f"sqlite:///{settings.SQLITE_DB_PATH}"
    else:
        db_url = (
            f"postgresql://{settings.PYARCHINIT_DB_USER}:{settings.PYARCHINIT_DB_PASSWORD}"
            f"@{settings.PYARCHINIT_DB_HOST}:{settings.PYARCHINIT_DB_PORT}"
            f"/{settings.PYARCHINIT_DB_NAME}"
        )

    print(f"Connecting to database: {db_url.split('@')[-1] if '@' in db_url else db_url}")

    # Create engine
    engine = create_engine(db_url)

    try:
        print("\nCreating all tables from models...")

        # Create all tables defined in models
        Base.metadata.create_all(bind=engine)
        DBBase.metadata.create_all(bind=engine)

        print("✅ Database initialized successfully!")
        print("   - All tables created with proper schema")
        print("   - You can now create an admin user with create_admin.py")

    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("PyArchInit Mobile PWA - Database Initialization")
    print("=" * 60)
    print()

    print("⚠️  WARNING: This will recreate tables if they don't exist")
    print("   Existing data will be preserved if tables already exist")
    print()

    response = input("Continue? (y/n): ").lower()
    if response != 'y':
        print("Aborted.")
        sys.exit(0)

    init_database()
    print()
