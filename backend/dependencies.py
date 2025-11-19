"""
FastAPI Dependencies for Multi-Project System
Handles project context extraction from headers and validation
"""
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from backend.services.auth_service import get_current_user
from backend.models.auth import User
from backend.services.dynamic_db_manager import get_auth_db, get_db_manager


async def get_current_project_id(
    x_project_id: Optional[int] = Header(None, alias="X-Project-ID")
) -> Optional[int]:
    """
    Extract project ID from X-Project-ID header.
    Returns None if not provided (for backwards compatibility).

    Frontend should send X-Project-ID header with every request that needs project context.
    """
    return x_project_id


async def get_current_project(
    project_id: Optional[int] = Depends(get_current_project_id),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
) -> int:
    """
    Get and validate current project ID from header.

    Verifies:
    1. Project ID is provided
    2. Project exists
    3. User has access to the project

    Returns:
        project_id (int): Validated project ID

    Raises:
        HTTPException 400: If project ID not provided
        HTTPException 403: If user doesn't have access
        HTTPException 404: If project doesn't exist
    """
    if project_id is None:
        raise HTTPException(
            status_code=400,
            detail="Project ID required. Send X-Project-ID header."
        )

    # Check if project exists
    project_row = db.execute(
        text("SELECT id, name FROM projects WHERE id = :project_id"),
        {"project_id": project_id}
    ).fetchone()

    if not project_row:
        raise HTTPException(
            status_code=404,
            detail=f"Project {project_id} not found"
        )

    # Check if user has access
    access_check = db.execute(
        text("""
            SELECT role FROM project_teams
            WHERE project_id = :project_id AND user_id = :user_id
        """),
        {"project_id": project_id, "user_id": current_user.id}
    ).fetchone()

    if not access_check:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to project '{project_row[1]}'"
        )

    return project_id


async def get_project_db_session(
    project_id: int = Depends(get_current_project)
):
    """
    Get database session for current project.

    Uses dynamic_db_manager to get the correct database connection
    based on project configuration (SQLite/PostgreSQL/Hybrid).

    Usage in routes:
    ```python
    @router.get("/us")
    async def get_us_data(
        project_id: int = Depends(get_current_project),
        project_db: Session = Depends(get_project_db_session)
    ):
        # Use project_db to query us_table
        result = project_db.execute(text("SELECT * FROM us_table"))
        ...
    ```
    """
    from sqlalchemy.orm import Session

    db_manager = get_db_manager()
    engine = db_manager.get_project_db(project_id)

    session = Session(engine)

    try:
        yield session
    finally:
        session.close()


async def require_project_permission(
    permission: str,
    project_id: int = Depends(get_current_project),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
) -> bool:
    """
    Check if user has specific permission in project.

    Args:
        permission: Permission name ("can_edit", "can_delete", "can_invite")
        project_id: Current project ID
        current_user: Current authenticated user
        db: Auth database session

    Returns:
        bool: True if user has permission

    Raises:
        HTTPException 403: If user doesn't have permission
    """
    import json

    # Get user's role and permissions
    result = db.execute(
        text("""
            SELECT role, permissions
            FROM project_teams
            WHERE project_id = :project_id AND user_id = :user_id
        """),
        {"project_id": project_id, "user_id": current_user.id}
    ).fetchone()

    if not result:
        raise HTTPException(status_code=403, detail="Access denied to project")

    role = result[0]
    permissions_json = result[1]

    # Owner and admin have all permissions
    if role in ["owner", "admin"]:
        return True

    # Check specific permission
    permissions = json.loads(permissions_json) if permissions_json else {}

    if not permissions.get(permission, False):
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied: {permission} required"
        )

    return True


# Dependency factories for specific permissions

def require_can_edit():
    """Dependency that requires can_edit permission"""
    async def _require_can_edit(
        project_id: int = Depends(get_current_project),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_auth_db)
    ):
        return await require_project_permission("can_edit", project_id, current_user, db)
    return _require_can_edit


def require_can_delete():
    """Dependency that requires can_delete permission"""
    async def _require_can_delete(
        project_id: int = Depends(get_current_project),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_auth_db)
    ):
        return await require_project_permission("can_delete", project_id, current_user, db)
    return _require_can_delete


def require_can_invite():
    """Dependency that requires can_invite permission"""
    async def _require_can_invite(
        project_id: int = Depends(get_current_project),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_auth_db)
    ):
        return await require_project_permission("can_invite", project_id, current_user, db)
    return _require_can_invite
