"""
Authentication API Routes

Endpoints:
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/me - Get current user info
- GET /api/auth/db-mode - Get current database mode
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from backend.services.auth_service import AuthService, get_current_user
from backend.services.db_manager import get_db, get_db_mode
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

@router.post("/register", response_model=LoginResponse)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register new user

    - Creates user account
    - In separate mode: Creates dedicated database
    - In hybrid mode: Creates default project
    - Returns access token
    """
    # Register user
    user = AuthService.register_user(
        email=request.email,
        password=request.password,
        name=request.name,
        db=db
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
        }
    }


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login user

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


@router.get("/db-mode")
async def get_database_mode():
    """
    Get current database mode configuration

    Returns:
    - mode: "separate" | "hybrid" | "sqlite"
    - description: Human-readable description
    """
    mode = get_db_mode()

    descriptions = {
        "separate": "Each user has their own PostgreSQL database",
        "hybrid": "Single PostgreSQL with Row-Level Security (collaborative)",
        "sqlite": "Local SQLite database (development only)"
    }

    return {
        "mode": mode,
        "description": descriptions.get(mode, "Unknown mode")
    }
