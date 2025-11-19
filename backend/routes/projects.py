"""
Multi-Project Management Routes
Handles project CRUD, team management, and database switching
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import json
import os
import shutil
from datetime import datetime

from backend.services.auth_service import get_current_user
from backend.models.auth import User
from backend.services.dynamic_db_manager import get_db_manager, get_auth_db
from backend.models.projects import (
    ProjectCreate,
    ProjectUpdate,
    ProjectInfo,
    ProjectListItem,
    ProjectCreateResponse,
    ProjectListResponse,
    ProjectDetailResponse,
    ProjectDeleteResponse,
    AddTeamMemberRequest,
    UpdateTeamMemberRequest,
    RemoveTeamMemberRequest,
    TeamMemberResponse,
    TeamMemberInfo,
    SwitchProjectRequest,
    SwitchProjectResponse,
    UploadDatabaseResponse,
    DatabaseMode,
    UserRole,
    ProjectPermissions
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _get_user_permissions(db: Session, project_id: int, user_id: int) -> tuple:
    """Get user's role and permissions for a project"""
    result = db.execute(
        text("""
            SELECT role, permissions
            FROM project_teams
            WHERE project_id = :project_id AND user_id = :user_id
        """),
        {"project_id": project_id, "user_id": user_id}
    ).fetchone()

    if not result:
        return None, None

    role = result[0]
    permissions = json.loads(result[1]) if result[1] else {}

    return role, permissions


def _check_permission(db: Session, project_id: int, user_id: int, required_permission: str) -> bool:
    """Check if user has specific permission in project"""
    role, permissions = _get_user_permissions(db, project_id, user_id)

    if not role:
        return False

    # Owner and admin have all permissions
    if role in ["owner", "admin"]:
        return True

    # Check specific permission
    return permissions.get(required_permission, False)


def _get_team_size(db: Session, project_id: int) -> int:
    """Get number of team members in project"""
    result = db.execute(
        text("SELECT COUNT(*) FROM project_teams WHERE project_id = :project_id"),
        {"project_id": project_id}
    ).scalar()
    return result or 0


def _build_project_list_item(row, role: str, team_size: int) -> dict:
    """Build ProjectListItem from database row"""
    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "db_mode": row[3],
        "is_personal": bool(row[4]),
        "created_at": row[5],
        "updated_at": row[6],
        "my_role": role,
        "team_size": team_size
    }


def _build_project_info(row, role: str, permissions: dict, team_members: List[dict] = None) -> dict:
    """Build ProjectInfo from database row"""
    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "owner_id": row[3],
        "db_mode": row[4],
        "is_personal": bool(row[5]),
        "created_at": row[6],
        "updated_at": row[7],
        "my_role": role,
        "my_permissions": permissions,
        "team_members": team_members
    }


# ============================================================================
# PROJECT CRUD ENDPOINTS
# ============================================================================

@router.get("/my-projects", response_model=ProjectListResponse)
async def get_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Get list of all projects the current user has access to.
    Includes personal workspace and shared projects.
    """
    try:
        # Query projects where user is a team member
        query = text("""
            SELECT DISTINCT
                p.id,
                p.name,
                p.description,
                p.db_mode,
                p.is_personal,
                p.created_at,
                p.updated_at,
                pt.role
            FROM projects p
            INNER JOIN project_teams pt ON p.id = pt.project_id
            WHERE pt.user_id = :user_id
            ORDER BY p.is_personal DESC, p.created_at DESC
        """)

        results = db.execute(query, {"user_id": current_user.id}).fetchall()

        projects = []
        for row in results:
            project_id = row[0]
            role = row[7]
            team_size = _get_team_size(db, project_id)

            project = _build_project_list_item(row, role, team_size)
            projects.append(ProjectListItem(**project))

        return ProjectListResponse(
            success=True,
            projects=projects,
            total=len(projects)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching projects: {str(e)}")


@router.post("/create", response_model=ProjectCreateResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Create a new project with specified database configuration.
    User becomes owner with full permissions.
    """
    try:
        # Prepare db_config based on mode
        if project_data.db_mode == DatabaseMode.SQLITE:
            db_config = project_data.sqlite_config.dict()
        else:  # postgres or hybrid
            db_config = project_data.postgres_config.dict()

        # Insert project
        result = db.execute(
            text("""
                INSERT INTO projects (name, description, owner_id, db_mode, db_config, is_personal)
                VALUES (:name, :description, :owner_id, :db_mode, :db_config, :is_personal)
            """),
            {
                "name": project_data.name,
                "description": project_data.description,
                "owner_id": current_user.id,
                "db_mode": project_data.db_mode.value,
                "db_config": json.dumps(db_config),
                "is_personal": False
            }
        )

        project_id = db.execute(text("SELECT last_insert_rowid()")).scalar()

        # Add user as owner in team
        db.execute(
            text("""
                INSERT INTO project_teams (project_id, user_id, role, permissions)
                VALUES (:project_id, :user_id, :role, :permissions)
            """),
            {
                "project_id": project_id,
                "user_id": current_user.id,
                "role": "owner",
                "permissions": json.dumps({
                    "can_edit": True,
                    "can_delete": True,
                    "can_invite": True
                })
            }
        )

        db.commit()

        # Initialize database if SQLite
        if project_data.db_mode == DatabaseMode.SQLITE:
            db_manager = get_db_manager()
            db_path = db_config['path']
            os.makedirs(os.path.dirname(db_path), exist_ok=True)
            if not os.path.exists(db_path):
                db_manager._initialize_pyarchinit_db(db_path)

        # Fetch created project
        project_row = db.execute(
            text("""
                SELECT id, name, description, owner_id, db_mode, is_personal, created_at, updated_at
                FROM projects
                WHERE id = :project_id
            """),
            {"project_id": project_id}
        ).fetchone()

        permissions = {
            "can_edit": True,
            "can_delete": True,
            "can_invite": True
        }

        project_info = _build_project_info(project_row, "owner", permissions)

        return ProjectCreateResponse(
            success=True,
            project=ProjectInfo(**project_info),
            message=f"Project '{project_data.name}' created successfully"
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project_detail(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Get detailed information about a project, including team members.
    User must be a member of the project.
    """
    try:
        # Check user access
        role, permissions = _get_user_permissions(db, project_id, current_user.id)
        if not role:
            raise HTTPException(status_code=403, detail="Access denied to this project")

        # Get project details
        project_row = db.execute(
            text("""
                SELECT id, name, description, owner_id, db_mode, is_personal, created_at, updated_at
                FROM projects
                WHERE id = :project_id
            """),
            {"project_id": project_id}
        ).fetchone()

        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        # Get team members
        team_rows = db.execute(
            text("""
                SELECT pt.user_id, u.email, pt.role, pt.permissions, pt.joined_at
                FROM project_teams pt
                INNER JOIN users u ON pt.user_id = u.id
                WHERE pt.project_id = :project_id
                ORDER BY pt.role, u.email
            """),
            {"project_id": project_id}
        ).fetchall()

        team_members = []
        for team_row in team_rows:
            member_permissions = json.loads(team_row[3]) if team_row[3] else {}
            team_members.append(TeamMemberInfo(
                user_id=team_row[0],
                email=team_row[1],
                role=team_row[2],
                permissions=ProjectPermissions(**member_permissions),
                joined_at=team_row[4]
            ))

        project_info = _build_project_info(project_row, role, permissions, team_members)

        return ProjectDetailResponse(
            success=True,
            project=ProjectInfo(**project_info)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project: {str(e)}")


@router.put("/{project_id}", response_model=ProjectDetailResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Update project details (name, description).
    Requires owner or admin role.
    """
    try:
        # Check permission
        if not _check_permission(db, project_id, current_user.id, "can_edit"):
            raise HTTPException(status_code=403, detail="Permission denied")

        # Build update query
        updates = []
        params = {"project_id": project_id}

        if project_data.name is not None:
            updates.append("name = :name")
            params["name"] = project_data.name

        if project_data.description is not None:
            updates.append("description = :description")
            params["description"] = project_data.description

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Execute update
        db.execute(
            text(f"UPDATE projects SET {', '.join(updates)} WHERE id = :project_id"),
            params
        )
        db.commit()

        # Return updated project
        return await get_project_detail(project_id, current_user, db)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating project: {str(e)}")


@router.delete("/{project_id}", response_model=ProjectDeleteResponse)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Delete a project.
    Only owner can delete. Personal workspaces cannot be deleted.
    Creates backup of SQLite database before deletion.
    """
    try:
        # Get project details
        project_row = db.execute(
            text("SELECT owner_id, is_personal, db_mode, db_config FROM projects WHERE id = :project_id"),
            {"project_id": project_id}
        ).fetchone()

        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        # Check ownership
        if project_row[0] != current_user.id:
            raise HTTPException(status_code=403, detail="Only project owner can delete project")

        # Prevent deletion of personal workspace
        if project_row[1]:
            raise HTTPException(status_code=400, detail="Cannot delete personal workspace")

        # Backup SQLite database if exists
        backup_path = None
        if project_row[2] == "sqlite":
            db_config = json.loads(project_row[3])
            db_path = db_config.get('path')

            if db_path and os.path.exists(db_path):
                backup_dir = os.path.join(os.path.dirname(db_path), "backups")
                os.makedirs(backup_dir, exist_ok=True)

                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_filename = f"project_{project_id}_backup_{timestamp}.sqlite"
                backup_path = os.path.join(backup_dir, backup_filename)

                shutil.copy2(db_path, backup_path)

        # Delete project (cascade will delete team members)
        db.execute(
            text("DELETE FROM projects WHERE id = :project_id"),
            {"project_id": project_id}
        )
        db.commit()

        return ProjectDeleteResponse(
            success=True,
            message="Project deleted successfully",
            backup_created=backup_path is not None,
            backup_path=backup_path
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting project: {str(e)}")


# ============================================================================
# TEAM MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/{project_id}/team", response_model=TeamMemberResponse)
async def add_team_member(
    project_id: int,
    member_data: AddTeamMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Add a user to project team.
    Requires can_invite permission.
    """
    try:
        # Check permission
        if not _check_permission(db, project_id, current_user.id, "can_invite"):
            raise HTTPException(status_code=403, detail="Permission denied: cannot invite users")

        # Find user by email
        user_row = db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": member_data.email}
        ).fetchone()

        if not user_row:
            raise HTTPException(status_code=404, detail=f"User with email '{member_data.email}' not found")

        new_user_id = user_row[0]

        # Check if already member
        existing = db.execute(
            text("SELECT id FROM project_teams WHERE project_id = :project_id AND user_id = :user_id"),
            {"project_id": project_id, "user_id": new_user_id}
        ).fetchone()

        if existing:
            raise HTTPException(status_code=400, detail="User is already a team member")

        # Default permissions based on role
        if member_data.permissions:
            permissions = member_data.permissions.dict()
        else:
            # Default permissions
            permissions = {
                "can_edit": member_data.role in ["admin", "member"],
                "can_delete": member_data.role == "admin",
                "can_invite": member_data.role == "admin"
            }

        # Add to team
        db.execute(
            text("""
                INSERT INTO project_teams (project_id, user_id, role, permissions)
                VALUES (:project_id, :user_id, :role, :permissions)
            """),
            {
                "project_id": project_id,
                "user_id": new_user_id,
                "role": member_data.role.value,
                "permissions": json.dumps(permissions)
            }
        )
        db.commit()

        # Return team member info
        team_member = TeamMemberInfo(
            user_id=new_user_id,
            email=member_data.email,
            role=member_data.role,
            permissions=ProjectPermissions(**permissions),
            joined_at=datetime.now()
        )

        return TeamMemberResponse(
            success=True,
            message=f"User '{member_data.email}' added to project team",
            team_member=team_member
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding team member: {str(e)}")


@router.delete("/{project_id}/team/{user_id}", response_model=TeamMemberResponse)
async def remove_team_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Remove a user from project team.
    Requires can_invite permission. Cannot remove project owner.
    """
    try:
        # Check permission
        if not _check_permission(db, project_id, current_user.id, "can_invite"):
            raise HTTPException(status_code=403, detail="Permission denied: cannot remove team members")

        # Check if user is owner
        project_row = db.execute(
            text("SELECT owner_id FROM projects WHERE id = :project_id"),
            {"project_id": project_id}
        ).fetchone()

        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        if project_row[0] == user_id:
            raise HTTPException(status_code=400, detail="Cannot remove project owner from team")

        # Remove from team
        result = db.execute(
            text("DELETE FROM project_teams WHERE project_id = :project_id AND user_id = :user_id"),
            {"project_id": project_id, "user_id": user_id}
        )
        db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found in project team")

        return TeamMemberResponse(
            success=True,
            message="Team member removed successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error removing team member: {str(e)}")


# ============================================================================
# PROJECT SWITCHING ENDPOINT
# ============================================================================

@router.post("/switch", response_model=SwitchProjectResponse)
async def switch_project(
    switch_data: SwitchProjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Switch to a different project.
    Returns project info for frontend to update context.
    Frontend should store project_id and send it in X-Project-ID header.
    """
    try:
        # Verify user has access to project
        role, permissions = _get_user_permissions(db, switch_data.project_id, current_user.id)

        if not role:
            raise HTTPException(status_code=403, detail="Access denied to this project")

        # Get project details
        project_row = db.execute(
            text("SELECT name, db_mode FROM projects WHERE id = :project_id"),
            {"project_id": switch_data.project_id}
        ).fetchone()

        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        return SwitchProjectResponse(
            success=True,
            project_id=switch_data.project_id,
            project_name=project_row[0],
            db_mode=project_row[1],
            message=f"Switched to project '{project_row[0]}'"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error switching project: {str(e)}")


# ============================================================================
# DATABASE UPLOAD ENDPOINT
# ============================================================================

@router.post("/{project_id}/upload-db", response_model=UploadDatabaseResponse)
async def upload_database(
    project_id: int,
    file: UploadFile = File(...),
    backup_existing: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Upload SQLite database file to replace project database.
    Only works for SQLite projects. Requires owner role.
    Creates backup of existing database before replacing.
    """
    try:
        # Get project details
        project_row = db.execute(
            text("SELECT owner_id, db_mode, db_config FROM projects WHERE id = :project_id"),
            {"project_id": project_id}
        ).fetchone()

        if not project_row:
            raise HTTPException(status_code=404, detail="Project not found")

        # Check ownership
        if project_row[0] != current_user.id:
            raise HTTPException(status_code=403, detail="Only project owner can upload database")

        # Check if SQLite
        if project_row[1] != "sqlite":
            raise HTTPException(status_code=400, detail="Can only upload databases to SQLite projects")

        # Get database path
        db_config = json.loads(project_row[2])
        db_path = db_config.get('path')

        if not db_path:
            raise HTTPException(status_code=500, detail="Invalid database configuration")

        # Backup existing database
        backup_path = None
        if backup_existing and os.path.exists(db_path):
            backup_dir = os.path.join(os.path.dirname(db_path), "backups")
            os.makedirs(backup_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"project_{project_id}_backup_{timestamp}.sqlite"
            backup_path = os.path.join(backup_dir, backup_filename)

            shutil.copy2(db_path, backup_path)

        # Save uploaded file
        content = await file.read()
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        with open(db_path, 'wb') as f:
            f.write(content)

        # Validate database and get table info
        import sqlite3
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]

        # Get record counts
        records_count = {}
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            records_count[table] = cursor.fetchone()[0]

        conn.close()

        return UploadDatabaseResponse(
            success=True,
            message="Database uploaded successfully",
            backup_path=backup_path,
            tables_imported=tables,
            records_count=records_count
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading database: {str(e)}")
