"""
Authentication API Routes

IMPORTANT: These endpoints use the SEPARATE AUTH DATABASE (auth.db),
NOT the PyArchInit archaeological data database!

Endpoints:
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user info
- GET /api/auth/db-mode - Get current database mode
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.services.auth_service import AuthService, get_current_user, require_admin
from backend.services.dynamic_db_manager import get_auth_db, get_db_manager
from backend.models.auth import User


router = APIRouter(prefix="/api/auth", tags=["auth"])


# ============================================
# Request/Response Models
# ============================================

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "archaeologist@example.com",
                "password": "securepassword123",
                "name": "Dr. Indiana Jones"
            }
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "archaeologist@example.com",
                "password": "securepassword123"
            }
        }


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ============================================
# Endpoints
# ============================================

@router.post("/register")
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_auth_db)
):
    """
    Register new user

    - Uses SEPARATE AUTH DATABASE (auth.db)
    - Creates user account (auto-approved for multi-project system)
    - Automatically creates personal workspace for new user
    - Returns access token and user info with default project_id
    """
    # Register user
    user = AuthService.register_user(
        email=request.email,
        password=request.password,
        name=request.name,
        db=db
    )

    # Create personal workspace for user
    try:
        db_manager = get_db_manager()
        project_id = db_manager.create_personal_workspace(
            user_id=user.id,
            user_name=user.name
        )
    except Exception as e:
        # Rollback user creation if workspace creation fails
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create personal workspace: {str(e)}"
        )

    # Generate token
    # Handle both Enum (PostgreSQL) and String (SQLite) for role
    role_str = user.role.value if hasattr(user.role, 'value') else user.role

    token = AuthService.create_access_token(
        user_id=user.id,
        email=user.email,
        role=role_str
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": role_str
        },
        "default_project_id": project_id,
        "message": f"Registration successful! Personal workspace created."
    }


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_auth_db)
):
    """
    Login user

    - Uses SEPARATE AUTH DATABASE (auth.db)
    - Verifies credentials
    - Returns access token
    """
    result = AuthService.login(
        email=request.email,
        password=request.password,
        db=db
    )

    return result


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information

    Requires: Bearer token in Authorization header
    """
    # Handle both Enum (PostgreSQL) and String (SQLite) for role
    role_str = current_user.role.value if hasattr(current_user.role, 'value') else current_user.role

    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": role_str
    }


@router.get("/db-info")
async def get_database_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_auth_db)
):
    """
    Get database configuration information for current user

    Returns:
    - Multi-project mode info
    - User's project count
    - Personal workspace info
    """
    from sqlalchemy import text

    # Count user's projects
    result = db.execute(
        text("""
            SELECT COUNT(*)
            FROM project_teams
            WHERE user_id = :user_id
        """),
        {"user_id": current_user.id}
    ).scalar()

    project_count = result or 0

    # Get personal workspace
    personal_workspace = db.execute(
        text("""
            SELECT p.id, p.name, p.db_mode
            FROM projects p
            INNER JOIN project_teams pt ON p.id = pt.project_id
            WHERE pt.user_id = :user_id AND p.is_personal = 1
            LIMIT 1
        """),
        {"user_id": current_user.id}
    ).fetchone()

    return {
        "mode": "multi-project",
        "description": "Multi-project system with personal workspace",
        "user_projects_count": project_count,
        "personal_workspace": {
            "id": personal_workspace[0],
            "name": personal_workspace[1],
            "db_mode": personal_workspace[2]
        } if personal_workspace else None
    }


# ============================================
# Admin Endpoints
# ============================================

@router.get("/admin/users")
async def get_all_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_auth_db)
):
    """
    Get all users (for admin management)

    Requires: Admin role
    Returns: List of all users with their stats
    """
    from sqlalchemy import text

    users = db.query(User).all()

    user_list = []
    for user in users:
        # Count projects for each user
        project_count = db.execute(
            text("SELECT COUNT(*) FROM project_collaborators WHERE user_id = :user_id"),
            {"user_id": user.id}
        ).scalar()

        # Get approval_status with fallback for older records
        approval_status = getattr(user, 'approval_status', 'approved')

        user_list.append({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value if hasattr(user.role, 'value') else user.role,
            "is_active": user.is_active,
            "approval_status": approval_status,
            "projects_count": project_count or 0,
            "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else None
        })

    return {
        "users": user_list,
        "total": len(user_list)
    }


@router.post("/emergency-approve")
async def emergency_approve_first_admin(db: Session = Depends(get_auth_db)):
    """
    Emergency endpoint: Auto-approve first user as admin if no approved admins exist

    Use this ONLY when the first admin is stuck in pending status
    Returns success message or error if conditions not met
    """
    from sqlalchemy import text

    # Check if there are any approved admins
    approved_admin = db.execute(
        text("""
            SELECT id FROM users
            WHERE role = 'admin' AND approval_status = 'approved'
            LIMIT 1
        """)
    ).fetchone()

    if approved_admin:
        raise HTTPException(
            status_code=400,
            detail="An approved admin already exists. Emergency approval not needed."
        )

    # Auto-approve the first registered user (ID = 1)
    result = db.execute(
        text("""
            UPDATE users
            SET approval_status = 'approved', role = 'admin'
            WHERE id = 1
        """)
    )
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="User with ID 1 not found"
        )

    # Get updated user info
    user = db.execute(
        text("SELECT id, email, name, role, approval_status FROM users WHERE id = 1")
    ).fetchone()

    return {
        "success": True,
        "message": "First admin auto-approved successfully!",
        "user": {
            "id": user[0],
            "email": user[1],
            "name": user[2],
            "role": user[3],
            "approval_status": user[4]
        }
    }


@router.post("/admin/approve/{user_id}")
async def approve_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_auth_db)
):
    """
    Approve pending user (Admin only)

    Requires: Admin role
    Changes user approval_status from 'pending' to 'approved'
    """
    from sqlalchemy import text

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update approval status
    db.execute(
        text("UPDATE users SET approval_status = 'approved' WHERE id = :user_id"),
        {"user_id": user_id}
    )
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} approved successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "approval_status": "approved"
        }
    }


@router.post("/admin/reject/{user_id}")
async def reject_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_auth_db)
):
    """
    Reject pending user (Admin only)

    Requires: Admin role
    Changes user approval_status from 'pending' to 'rejected'
    """
    from sqlalchemy import text

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot reject yourself
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot reject yourself")

    # Update approval status
    db.execute(
        text("UPDATE users SET approval_status = 'rejected' WHERE id = :user_id"),
        {"user_id": user_id}
    )
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} rejected",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "approval_status": "rejected"
        }
    }


@router.put("/admin/users/{user_id}/role")
async def change_user_role(
    user_id: int,
    role: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_auth_db)
):
    """
    Change user role (Admin only)

    Requires: Admin role
    Allowed roles: admin, archaeologist, student, viewer
    """
    from sqlalchemy import text

    # Validate role
    allowed_roles = ["admin", "archaeologist", "student", "viewer"]
    if role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed: {', '.join(allowed_roles)}"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot change your own role
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    # Update role
    db.execute(
        text("UPDATE users SET role = :role WHERE id = :user_id"),
        {"role": role, "user_id": user_id}
    )
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} role changed to {role}",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": role
        }
    }


@router.put("/admin/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_auth_db)
):
    """
    Activate/Deactivate user (Admin only)

    Requires: Admin role
    Toggles user's is_active status
    """
    from sqlalchemy import text

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot deactivate yourself
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    # Toggle active status
    new_status = not user.is_active
    db.execute(
        text("UPDATE users SET is_active = :status WHERE id = :user_id"),
        {"status": new_status, "user_id": user_id}
    )
    db.commit()

    return {
        "success": True,
        "message": f"User {user.email} {'activated' if new_status else 'deactivated'}",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "is_active": new_status
        }
    }
