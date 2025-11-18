#!/usr/bin/env python
"""
Initialize authentication tables in SEPARATE Auth Database

IMPORTANT: This creates tables in the AUTH database (auth.db),
NOT in the PyArchInit database!

Auth Database Tables:
- users: User accounts
- user_databases: Maps users to their PyArchInit databases
- projects: Archaeological projects
- project_collaborators: Project access control
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from backend.models.auth_base import AuthBase
from backend.services.db_manager import get_auth_engine


def init_auth_tables():
    """
    Create all auth tables in separate auth database using SQLAlchemy

    This uses AuthBase.metadata to create all tables defined in models/auth.py:
    - User
    - Project
    - ProjectCollaborator
    - UserDatabase
    """
    print(f"Initializing auth database at: {settings.AUTH_DB_PATH}")

    # Ensure auth DB directory exists
    auth_db_path = Path(settings.AUTH_DB_PATH)
    auth_db_path.parent.mkdir(parents=True, exist_ok=True)

    # Get auth database engine
    engine = get_auth_engine()

    # Import auth models to ensure they're registered with AuthBase
    from backend.models import auth  # noqa: F401

    # Create all tables defined with AuthBase
    AuthBase.metadata.create_all(bind=engine)

    print(f"✓ Auth tables initialized successfully in: {settings.AUTH_DB_PATH}")
    print(f"  Tables created: users, projects, project_collaborators, user_databases")


if __name__ == "__main__":
    init_auth_tables()
