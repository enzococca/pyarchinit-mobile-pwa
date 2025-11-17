#!/usr/bin/env python
"""
Initialize authentication tables in SQLite database
This is a simplified version of migrations for SQLite mode
"""
import sqlite3
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

def init_auth_tables():
    """Create auth tables in SQLite database"""

    # Get absolute path of this script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Use SQLITE_DB_PATH if set, otherwise default to pyarchinit_db.sqlite in script dir
    db_path_str = settings.SQLITE_DB_PATH if settings.SQLITE_DB_PATH else "pyarchinit_db.sqlite"

    # Ensure path is absolute
    if not os.path.isabs(db_path_str):
        # Strip all "backend/" prefixes (handles misconfigured paths)
        while db_path_str.startswith("backend/"):
            db_path_str = db_path_str[len("backend/"):]
        # Make relative path absolute relative to script directory
        db_path_str = os.path.join(script_dir, db_path_str)

    db_path = Path(db_path_str)
    print(f"Initializing auth tables in: {db_path}")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'archaeologist',
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )
    """)

    # Create projects table (for hybrid mode, but also useful for sqlite)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            owner_user_id INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Create project_collaborators table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_collaborators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role VARCHAR(50) DEFAULT 'contributor',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(project_id, user_id)
        )
    """)

    # Add project_id column to existing tables if they don't exist
    try:
        cursor.execute("ALTER TABLE site_table ADD COLUMN project_id INTEGER")
        print("Added project_id to site_table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    try:
        cursor.execute("ALTER TABLE site_table ADD COLUMN created_by_user INTEGER")
        print("Added created_by_user to site_table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    try:
        cursor.execute("ALTER TABLE us_table ADD COLUMN project_id INTEGER")
        print("Added project_id to us_table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    try:
        cursor.execute("ALTER TABLE us_table ADD COLUMN created_by_user INTEGER")
        print("Added created_by_user to us_table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    try:
        cursor.execute("ALTER TABLE media_table ADD COLUMN project_id INTEGER")
        print("Added project_id to media_table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    try:
        cursor.execute("ALTER TABLE media_table ADD COLUMN created_by_user INTEGER")
        print("Added created_by_user to media_table")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    try:
        cursor.execute("ALTER TABLE mobile_notes ADD COLUMN project_id INTEGER")
        print("Added project_id to mobile_notes")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    try:
        cursor.execute("ALTER TABLE mobile_notes ADD COLUMN created_by_user INTEGER")
        print("Added created_by_user to mobile_notes")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            print(f"Note: {e}")

    conn.commit()
    conn.close()

    print("✓ Auth tables initialized successfully!")

if __name__ == "__main__":
    init_auth_tables()
