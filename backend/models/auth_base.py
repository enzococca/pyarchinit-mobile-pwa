"""
Authentication Database Base

Separate declarative base for authentication database.
This keeps user/auth tables completely separate from PyArchInit archaeological data.

Auth Database Tables:
- users: User accounts
- user_databases: Maps users to their PyArchInit databases
- projects: Archaeological projects (for hybrid/shared mode)
- project_collaborators: Project access control
"""

from sqlalchemy.ext.declarative import declarative_base

# Separate Base for authentication database
AuthBase = declarative_base()
