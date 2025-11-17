"""
Authentication Service - JWT Token Management and Password Security

Handles:
- User registration
- Login/logout
- JWT token creation and verification
- Password hashing and verification
- Current user extraction from tokens
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
import jwt
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models.auth import User, Project, ProjectCollaborator, ProjectRole
from backend.services.db_manager import get_db, create_user_database, get_db_mode


# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Security scheme for FastAPI
security = HTTPBearer()


class AuthService:
    """Authentication service"""

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password using bcrypt

        Args:
            password: Plain text password

        Returns:
            Hashed password
        """
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify password against hash

        Args:
            plain_password: Plain text password
            hashed_password: Hashed password

        Returns:
            True if password matches
        """
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def create_access_token(user_id: int, email: str, role: str = "archaeologist") -> str:
        """
        Create JWT access token

        Args:
            user_id: User ID
            email: User email
            role: User role

        Returns:
            JWT token string
        """
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)

        payload = {
            "user_id": user_id,
            "email": email,
            "role": role,
            "exp": expire,
            "iat": datetime.utcnow()
        }

        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
        return token

    @staticmethod
    def verify_token(token: str) -> dict:
        """
        Verify and decode JWT token

        Args:
            token: JWT token string

        Returns:
            Decoded payload

        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )

    @staticmethod
    def register_user(
        email: str,
        password: str,
        name: str,
        db: Session
    ) -> User:
        """
        Register new user

        Args:
            email: User email
            password: Plain text password
            name: User name
            db: Database session

        Returns:
            Created user

        Raises:
            HTTPException: If email already exists
        """
        # Check if user exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user
        hashed_password = AuthService.hash_password(password)
        user = User(
            email=email,
            password_hash=hashed_password,
            name=name
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Handle database mode-specific setup
        db_mode = get_db_mode()

        if db_mode == "separate":
            # Create separate database for user
            success = create_user_database(user.id)
            if not success:
                # Rollback user creation if database creation fails
                db.delete(user)
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user database"
                )

        elif db_mode == "hybrid":
            # Create default project for user
            project = Project(
                name=f"{name}'s Project",
                description="Default project",
                owner_user_id=user.id
            )
            db.add(project)
            db.commit()
            db.refresh(project)

            # Add user as project owner
            collaborator = ProjectCollaborator(
                project_id=project.id,
                user_id=user.id,
                role=ProjectRole.OWNER
            )
            db.add(collaborator)
            db.commit()

        return user

    @staticmethod
    def login(email: str, password: str, db: Session) -> dict:
        """
        Login user

        Args:
            email: User email
            password: Plain text password
            db: Database session

        Returns:
            Dictionary with token and user info

        Raises:
            HTTPException: If credentials are invalid
        """
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Verify password
        if not AuthService.verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated"
            )

        # Create token
        token = AuthService.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value
            }
        }


# FastAPI dependencies
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get current authenticated user

    Usage:
        @app.get("/protected")
        def protected_route(current_user: User = Depends(get_current_user)):
            return {"user_id": current_user.id}

    Args:
        credentials: Bearer token from request
        db: Database session

    Returns:
        Current user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    payload = AuthService.verify_token(token)

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> int:
    """
    FastAPI dependency to get current user ID without database query

    Faster alternative when you only need user_id

    Args:
        credentials: Bearer token from request

    Returns:
        User ID
    """
    token = credentials.credentials
    payload = AuthService.verify_token(token)

    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    return user_id


# Optional: Admin role check
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency to require admin role

    Usage:
        @app.delete("/users/{user_id}")
        def delete_user(admin: User = Depends(require_admin)):
            ...

    Args:
        current_user: Current authenticated user

    Returns:
        Current user (if admin)

    Raises:
        HTTPException: If user is not admin
    """
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
