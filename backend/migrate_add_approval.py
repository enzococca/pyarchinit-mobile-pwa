#!/usr/bin/env python3
"""
Database migration: Add approval_status column to users table
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from backend.config import settings


def migrate_add_approval_status():
    """
    Add approval_status column to users table if it doesn't exist
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

    engine = create_engine(db_url)

    with engine.connect() as conn:
        try:
            # Check if column already exists
            if settings.USE_SQLITE:
                result = conn.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result]

                if "approval_status" in columns:
                    print("✅ Column 'approval_status' already exists")
                    return

                # SQLite: Add column
                print("Adding 'approval_status' column to users table...")
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN approval_status VARCHAR(50) DEFAULT 'approved'"
                ))
                conn.commit()

            else:
                # PostgreSQL: Check if column exists
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='users' AND column_name='approval_status'
                """))

                if result.fetchone():
                    print("✅ Column 'approval_status' already exists")
                    return

                # PostgreSQL: Add column
                print("Adding 'approval_status' column to users table...")
                conn.execute(text(
                    "ALTER TABLE users ADD COLUMN approval_status VARCHAR(50) DEFAULT 'approved'"
                ))
                conn.commit()

            print("✅ Migration completed successfully!")
            print("   - Added 'approval_status' column with default value 'approved'")
            print("   - Existing users are automatically approved")

        except Exception as e:
            conn.rollback()
            print(f"❌ Migration failed: {str(e)}")
            raise


if __name__ == "__main__":
    print("=" * 60)
    print("PyArchInit Mobile PWA - Database Migration")
    print("Adding approval_status column to users table")
    print("=" * 60)
    print()

    migrate_add_approval_status()
    print()
