#!/usr/bin/env python3
"""
Script to create the first admin user for PyArchInit Mobile PWA
Run this once to create an administrator account that can approve other users.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

from backend.config import settings
from backend.models.auth import User
from backend.models.database import Base

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_admin_user(
    email: str = "admin@pyarchinit.com",
    password: str = "admin123",
    name: str = "Administrator"
):
    """
    Create the first admin user

    Args:
        email: Admin email (default: admin@pyarchinit.com)
        password: Admin password (default: admin123)
        name: Admin name (default: Administrator)
    """

    # Get database URL
    if settings.USE_SQLITE:
        db_url = f"sqlite:///{settings.SQLITE_DB_PATH}"
    else:
        db_url = (
            f"postgresql://{settings.PYARCHINIT_DB_USER}:{settings.PYARCHINIT_DB_PASSWORD}"
            f"@{settings.PYARCHINIT_DB_HOST}:{settings.PYARCHINIT_DB_PORT}"
            f"/{settings.PYARCHINIT_DB_NAME}"
        )

    print(f"Connecting to database: {db_url.split('@')[-1] if '@' in db_url else db_url}")

    # Create engine and session
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = session.query(User).filter(User.email == email).first()

        if existing_admin:
            print(f"⚠️  Admin user already exists: {email}")
            print(f"   User ID: {existing_admin.id}")
            print(f"   Name: {existing_admin.name}")
            print(f"   Role: {existing_admin.role}")

            # Ask if they want to reset password
            response = input("\nReset password? (y/n): ").lower()
            if response == 'y':
                existing_admin.password_hash = pwd_context.hash(password)
                session.commit()
                print(f"✅ Password reset successfully for {email}")
            return

        # Create new admin user
        hashed_password = pwd_context.hash(password)

        admin_user = User(
            email=email,
            password_hash=hashed_password,
            name=name,
            role="admin",  # Set as admin
            approval_status="approved"  # Auto-approve admin
        )

        session.add(admin_user)
        session.commit()

        print(f"\n✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Name: {name}")
        print(f"   Role: admin")
        print(f"\n⚠️  IMPORTANT: Change this password after first login!")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error creating admin user: {str(e)}")
        raise

    finally:
        session.close()


if __name__ == "__main__":
    print("=" * 60)
    print("PyArchInit Mobile PWA - Admin User Creation")
    print("=" * 60)
    print()

    # Check for command line arguments
    if len(sys.argv) > 1:
        email = sys.argv[1]
        password = sys.argv[2] if len(sys.argv) > 2 else "admin123"
        name = sys.argv[3] if len(sys.argv) > 3 else "Administrator"
    else:
        # Interactive mode
        print("Leave blank to use default values")
        print()
        email = input("Admin email (admin@pyarchinit.com): ").strip() or "admin@pyarchinit.com"
        password = input("Admin password (admin123): ").strip() or "admin123"
        name = input("Admin name (Administrator): ").strip() or "Administrator"
        print()

    create_admin_user(email, password, name)
    print()
