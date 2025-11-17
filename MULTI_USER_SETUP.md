# Multi-User Database Setup Guide

This guide explains how to set up and test the multi-user database system with two modes: **Separate** and **Hybrid**.

## 📋 What Was Implemented

### ✅ Complete Features

1. **Configuration System**
   - `DB_MODE` setting in `.env` (separate/hybrid/sqlite)
   - Template for separate database naming

2. **Database Manager** (`backend/services/db_manager.py`)
   - Automatic database creation (separate mode)
   - Row-Level Security context (hybrid mode)
   - Connection pooling and caching

3. **Authentication System**
   - User registration with password hashing (bcrypt)
   - JWT token-based login
   - User roles and permissions

4. **Database Models** (`backend/models/auth.py`)
   - Users table
   - Projects table (hybrid mode)
   - Project collaborators (hybrid mode)

5. **SQL Migrations**
   - `001_create_auth_tables.sql` - User management tables
   - `002_enable_row_level_security.sql` - RLS policies (hybrid only)

6. **API Endpoints** (`backend/routes/auth.py`)
   - `POST /api/auth/register` - User registration
   - `POST /api/auth/login` - User login
   - `GET /api/auth/me` - Current user info
   - `GET /api/auth/db-mode` - Database mode info

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

New dependencies added:
- `passlib[bcrypt]` - Password hashing
- `pyjwt` - JWT tokens
- `email-validator` - Email validation

### Step 2: Configure Database Mode

Edit `.env` file:

```bash
# Choose mode: "separate" | "hybrid" | "sqlite"
DB_MODE=hybrid

# PostgreSQL connection (required for separate and hybrid)
PYARCHINIT_DB_HOST=localhost
PYARCHINIT_DB_PORT=5432
PYARCHINIT_DB_NAME=pyarchinit_db
PYARCHINIT_DB_USER=postgres
PYARCHINIT_DB_PASSWORD=your_password

# Separate mode: database name template
SEPARATE_DB_NAME_TEMPLATE=pyarchinit_user

# Secret key for JWT (IMPORTANT: Change in production!)
SECRET_KEY=your-secret-key-here-change-in-production
```

### Step 3: Run Migrations

**For Hybrid Mode:**

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d pyarchinit_db

# Run migrations
\i backend/migrations/001_create_auth_tables.sql
\i backend/migrations/002_enable_row_level_security.sql

# Exit
\q
```

**For Separate Mode:**

```bash
# Only run migration 001 (skip RLS)
psql -h localhost -U postgres -d pyarchinit_db -f backend/migrations/001_create_auth_tables.sql
```

### Step 4: Update main.py

Add auth routes to `backend/main.py`:

```python
from routes import auth

# Add this after creating the app
app.include_router(auth.router)
```

### Step 5: Start Backend

```bash
cd backend
python main.py
```

Visit http://localhost:8000/docs to see the API documentation.

---

## 🧪 Testing the System

### Test 1: Register Users

```bash
# Register User 1
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123",
    "name": "User One"
  }'

# Register User 2
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@test.com",
    "password": "password123",
    "name": "User Two"
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user1@test.com",
    "name": "User One",
    "role": "archaeologist"
  }
}
```

**What Happens:**
- **Separate Mode**: Creates `pyarchinit_user_1` and `pyarchinit_user_2` databases
- **Hybrid Mode**: Creates default projects for each user

### Test 2: Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123"
  }'
```

Save the `access_token` from the response.

### Test 3: Access Protected Endpoint

```bash
TOKEN="your-access-token-here"

curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "id": 1,
  "email": "user1@test.com",
  "name": "User One",
  "role": "archaeologist"
}
```

### Test 4: Check Database Mode

```bash
curl http://localhost:8000/api/auth/db-mode
```

**Expected Response:**
```json
{
  "mode": "hybrid",
  "description": "Single PostgreSQL with Row-Level Security (collaborative)"
}
```

---

## 🔍 Verify Database Isolation

### Separate Mode Verification

```bash
# List databases
psql -h localhost -U postgres -l

# Should see:
# pyarchinit_user_1
# pyarchinit_user_2
```

### Hybrid Mode Verification

```sql
-- Connect to database
psql -h localhost -U postgres -d pyarchinit_db

-- Check users
SELECT id, email, name, role FROM users;

-- Check projects
SELECT p.id, p.name, p.owner_user_id, u.email as owner_email
FROM projects p
JOIN users u ON p.owner_user_id = u.id;

-- Check collaborators
SELECT pc.project_id, pc.user_id, pc.role, u.email
FROM project_collaborators pc
JOIN users u ON pc.user_id = u.id;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('site_table', 'us_table', 'media_table');
```

---

## 📊 Architecture Comparison

| Feature | Separate Mode | Hybrid Mode |
|---------|---------------|-------------|
| **Database per user** | ✅ Yes | ❌ No (shared) |
| **Data isolation** | 🔒 Physical | 🔒 Logical (RLS) |
| **Collaboration** | ❌ No | ✅ Yes |
| **Cost** | 💰💰💰 High | 💰 Low |
| **Backup complexity** | ⚠️ High (many DBs) | ✅ Simple (one DB) |
| **Scalability** | ⚠️ Limited | ✅ Good |

---

## 🐛 Troubleshooting

### Error: "Email already registered"

User already exists. Use different email or login with existing credentials.

### Error: "Failed to create user database" (Separate mode)

Check PostgreSQL permissions:

```sql
-- Grant create database permission
ALTER USER postgres CREATEDB;
```

### Error: "Invalid token"

Token expired or invalid. Login again to get new token.

### RLS Not Working (Hybrid mode)

Verify migration 002 was run:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'us_table';
-- rowsecurity should be true
```

---

## 🎯 Next Steps

Now that multi-user authentication is working, you can:

1. **Add Media Capture** - Implement photo/video/3D capture with tagging
2. **Implement Sync** - Add offline-first sync between mobile and server
3. **Project Management** - Create UI for inviting collaborators (hybrid mode)
4. **Permission System** - Implement fine-grained permissions (owner/editor/viewer)

---

## 📚 File Structure

```
backend/
├── config.py                          # Updated with DB_MODE
├── requirements.txt                   # Added passlib, pyjwt
├── models/
│   └── auth.py                        # NEW: User/Project models
├── services/
│   ├── db_manager.py                  # NEW: Multi-mode database manager
│   └── auth_service.py                # NEW: Authentication logic
├── routes/
│   └── auth.py                        # NEW: Auth API endpoints
└── migrations/
    ├── 001_create_auth_tables.sql     # NEW: User tables
    └── 002_enable_row_level_security.sql  # NEW: RLS policies
```

---

## 🔐 Security Notes

1. **Change SECRET_KEY**: Generate a random key for production:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Use HTTPS**: In production, always use HTTPS for API calls

3. **Token Expiration**: Tokens expire after 30 days (configurable in `auth_service.py`)

4. **Password Policy**: Consider adding password strength requirements

5. **Rate Limiting**: Add rate limiting to prevent brute force attacks

---

## ✅ Testing Checklist

- [ ] Install new dependencies (`pip install -r requirements.txt`)
- [ ] Configure DB_MODE in .env
- [ ] Run migrations (001 for both modes, 002 for hybrid only)
- [ ] Update main.py to include auth router
- [ ] Start backend server
- [ ] Test user registration (2 users)
- [ ] Test login
- [ ] Test protected endpoint (/api/auth/me)
- [ ] Verify database isolation (separate databases OR RLS policies)
- [ ] Test with frontend (optional)

---

**Need Help?** Check the main documentation or open an issue on GitHub.
