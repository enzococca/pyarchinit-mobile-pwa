#!/usr/bin/env python3
"""
Initialize SQLite database with authentication tables
Run this script before using SQLite mode
"""
import os
import sqlite3
from pathlib import Path

# Database path
DB_DIR = Path(__file__).parent / "data"
DB_PATH = DB_DIR / "pyarchinit_mobile.db"

def init_sqlite_auth_tables():
    """Create authentication tables in SQLite database"""
    
    # Ensure data directory exists
    DB_DIR.mkdir(exist_ok=True)
    
    print(f"Initializing SQLite database at: {DB_PATH}")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create projects table (for hybrid mode)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            sito VARCHAR(255),
            description TEXT,
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    # Create project_collaborators table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_collaborators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role VARCHAR(50) DEFAULT 'collaborator',
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE (project_id, user_id)
        )
    """)
    
    # Create media_table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS media_table (
            id_media INTEGER PRIMARY KEY AUTOINCREMENT,
            mediatype VARCHAR(50),
            filename VARCHAR(255),
            filetype VARCHAR(50),
            filepath TEXT,
            descrizione TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create media_thumb_table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS media_thumb_table (
            id_media_thumb INTEGER PRIMARY KEY AUTOINCREMENT,
            id_media INTEGER NOT NULL,
            mediatype VARCHAR(50),
            filename VARCHAR(255),
            media_thumb_filename VARCHAR(255),
            filetype VARCHAR(50),
            filepath_thumb TEXT,
            filepath_resize TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_media) REFERENCES media_table(id_media) ON DELETE CASCADE
        )
    """)
    
    # Create media_to_entity_table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS media_to_entity_table (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_entity INTEGER NOT NULL,
            entity_type VARCHAR(100),
            table_name VARCHAR(100),
            id_media INTEGER NOT NULL,
            filepath TEXT,
            media_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_media) REFERENCES media_table(id_media) ON DELETE CASCADE
        )
    """)
    
    # Create indexes for better performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_media_entity ON media_to_entity_table(id_entity, entity_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_project_owner ON projects(owner_id)")
    
    conn.commit()
    conn.close()
    
    print("✅ SQLite database initialized successfully!")
    print(f"📁 Database location: {DB_PATH}")
    print("\nTables created:")
    print("  - users")
    print("  - projects")
    print("  - project_collaborators")
    print("  - media_table")
    print("  - media_thumb_table")
    print("  - media_to_entity_table")
    print("\n💡 You can now start the backend with DB_MODE=sqlite")

if __name__ == "__main__":
    init_sqlite_auth_tables()
