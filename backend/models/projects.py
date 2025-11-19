"""
Pydantic models for multi-project system
Handles project creation, team management, and database configuration
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class DatabaseMode(str, Enum):
    """Database mode options for projects"""
    SQLITE = "sqlite"
    POSTGRES = "postgres"
    HYBRID = "hybrid"


class UserRole(str, Enum):
    """User roles in project teams"""
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


# ============================================================================
# DATABASE CONFIGURATION MODELS
# ============================================================================

class SQLiteConfig(BaseModel):
    """SQLite database configuration"""
    path: Optional[str] = Field(None, description="Path to SQLite database file (auto-generated if not provided)")


class PostgresConfig(BaseModel):
    """PostgreSQL database configuration"""
    host: str = Field(..., description="PostgreSQL host")
    port: int = Field(5432, description="PostgreSQL port")
    database: str = Field(..., description="Database name")
    user: str = Field(..., description="Database user")
    password: str = Field(..., description="Database password")

    @validator('port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v


# ============================================================================
# PROJECT MODELS
# ============================================================================

class ProjectCreate(BaseModel):
    """Request model for creating a new project"""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    db_mode: DatabaseMode = Field(..., description="Database mode (sqlite/postgres/hybrid)")

    # Database configuration (one of these must be provided based on db_mode)
    sqlite_config: Optional[SQLiteConfig] = None
    postgres_config: Optional[PostgresConfig] = None

    @validator('sqlite_config', always=True)
    def validate_sqlite_config(cls, v, values):
        """Ensure SQLite config is provided when db_mode is sqlite"""
        if 'db_mode' in values and values['db_mode'] == DatabaseMode.SQLITE:
            if not v:
                raise ValueError('sqlite_config is required when db_mode is sqlite')
        return v

    @validator('postgres_config', always=True)
    def validate_postgres_config(cls, v, values):
        """Ensure PostgreSQL config is provided when db_mode is postgres or hybrid"""
        if 'db_mode' in values and values['db_mode'] in [DatabaseMode.POSTGRES, DatabaseMode.HYBRID]:
            if not v:
                raise ValueError('postgres_config is required when db_mode is postgres or hybrid')
        return v


class ProjectUpdate(BaseModel):
    """Request model for updating a project"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectPermissions(BaseModel):
    """User permissions within a project"""
    can_edit: bool = Field(True, description="Can edit data")
    can_delete: bool = Field(False, description="Can delete data")
    can_invite: bool = Field(False, description="Can invite team members")


class TeamMemberInfo(BaseModel):
    """Team member information"""
    user_id: int
    email: str
    role: UserRole
    permissions: ProjectPermissions
    joined_at: datetime


class ProjectInfo(BaseModel):
    """Complete project information"""
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    db_mode: DatabaseMode
    is_personal: bool
    created_at: datetime
    updated_at: datetime

    # Current user's role and permissions
    my_role: Optional[UserRole] = None
    my_permissions: Optional[ProjectPermissions] = None

    # Team info (optional, included in detailed view)
    team_members: Optional[List[TeamMemberInfo]] = None

    class Config:
        from_attributes = True


class ProjectListItem(BaseModel):
    """Minimal project information for list view"""
    id: int
    name: str
    description: Optional[str]
    db_mode: DatabaseMode
    is_personal: bool
    my_role: UserRole
    team_size: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# TEAM MANAGEMENT MODELS
# ============================================================================

class AddTeamMemberRequest(BaseModel):
    """Request to add a team member"""
    email: str = Field(..., description="Email of user to add")
    role: UserRole = Field(UserRole.MEMBER, description="Role to assign")
    permissions: Optional[ProjectPermissions] = None

    @validator('role')
    def validate_role(cls, v):
        """Prevent setting owner role via this endpoint"""
        if v == UserRole.OWNER:
            raise ValueError('Cannot assign owner role via this endpoint')
        return v


class UpdateTeamMemberRequest(BaseModel):
    """Request to update team member role/permissions"""
    role: Optional[UserRole] = None
    permissions: Optional[ProjectPermissions] = None

    @validator('role')
    def validate_role(cls, v):
        """Prevent setting owner role via this endpoint"""
        if v == UserRole.OWNER:
            raise ValueError('Cannot change owner role via this endpoint')
        return v


class RemoveTeamMemberRequest(BaseModel):
    """Request to remove a team member"""
    user_id: int = Field(..., description="User ID to remove")


# ============================================================================
# DATABASE UPLOAD MODELS
# ============================================================================

class UploadDatabaseRequest(BaseModel):
    """Request to upload SQLite database for project"""
    backup_existing: bool = Field(True, description="Backup existing database before replacing")


class UploadDatabaseResponse(BaseModel):
    """Response after database upload"""
    success: bool
    message: str
    backup_path: Optional[str] = None
    tables_imported: Optional[List[str]] = None
    records_count: Optional[Dict[str, int]] = None


# ============================================================================
# PROJECT SWITCHING MODELS
# ============================================================================

class SwitchProjectRequest(BaseModel):
    """Request to switch active project"""
    project_id: int = Field(..., description="Project ID to switch to")


class SwitchProjectResponse(BaseModel):
    """Response after switching project"""
    success: bool
    project_id: int
    project_name: str
    db_mode: DatabaseMode
    message: str


# ============================================================================
# RESPONSE MODELS
# ============================================================================

class ProjectCreateResponse(BaseModel):
    """Response after creating a project"""
    success: bool
    project: ProjectInfo
    message: str


class ProjectListResponse(BaseModel):
    """Response containing list of projects"""
    success: bool
    projects: List[ProjectListItem]
    total: int


class ProjectDetailResponse(BaseModel):
    """Response containing detailed project information"""
    success: bool
    project: ProjectInfo


class TeamMemberResponse(BaseModel):
    """Response after team member operation"""
    success: bool
    message: str
    team_member: Optional[TeamMemberInfo] = None


class ProjectDeleteResponse(BaseModel):
    """Response after deleting a project"""
    success: bool
    message: str
    backup_created: bool = False
    backup_path: Optional[str] = None
