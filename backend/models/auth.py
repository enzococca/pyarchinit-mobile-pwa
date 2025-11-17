"""
Authentication Models - User Management for Multi-User Support

Tables:
- users: User accounts
- projects: Archaeological projects (hybrid mode)
- project_collaborators: Project access control (hybrid mode)
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
import os

from backend.models.database import Base


class UserRole(str, enum.Enum):
    """User roles"""
    ADMIN = "admin"
    ARCHAEOLOGIST = "archaeologist"
    STUDENT = "student"
    VIEWER = "viewer"


class ProjectRole(str, enum.Enum):
    """Project-specific roles"""
    OWNER = "owner"
    EDITOR = "editor"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"


# Use String for SQLite compatibility, Enum for PostgreSQL
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() == "true"
RoleColumn = String(50) if USE_SQLITE else Enum(UserRole)
ProjectRoleColumn = String(50) if USE_SQLITE else Enum(ProjectRole)


class User(Base):
    """
    User accounts

    In separate mode: Each user gets their own database
    In hybrid mode: All users share database with RLS
    """
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(RoleColumn, default="archaeologist")  # Use string default for SQLite compatibility
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (hybrid mode only)
    owned_projects = relationship(
        "Project",
        back_populates="owner",
        foreign_keys="Project.owner_user_id"
    )
    project_collaborations = relationship(
        "ProjectCollaborator",
        back_populates="user"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"


class Project(Base):
    """
    Archaeological projects (hybrid mode only)

    In separate mode: Not used (each user has own DB)
    In hybrid mode: Defines data boundaries for RLS
    """
    __tablename__ = "projects"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    owner_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_projects", foreign_keys=[owner_user_id])
    collaborators = relationship("ProjectCollaborator", back_populates="project")

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}', owner_id={self.owner_user_id})>"


class ProjectCollaborator(Base):
    """
    Project access control (hybrid mode only)

    Defines who can access which projects and with what permissions
    """
    __tablename__ = "project_collaborators"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(ProjectRoleColumn, default="contributor")  # Use string default for SQLite compatibility
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="collaborators")
    user = relationship("User", back_populates="project_collaborations")

    def __repr__(self):
        return f"<ProjectCollaborator(project_id={self.project_id}, user_id={self.user_id}, role={self.role})>"
