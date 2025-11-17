-- Migration 001: Create Authentication Tables
-- For Hybrid Mode: Single PostgreSQL with Row-Level Security

-- ============================================
-- STEP 1: Create User Management Tables
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'archaeologist',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Projects table (for hybrid mode)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_projects_owner ON projects(owner_user_id);
CREATE INDEX idx_projects_is_active ON projects(is_active);

-- Project collaborators table
CREATE TABLE IF NOT EXISTS project_collaborators (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'contributor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_collaborators_project ON project_collaborators(project_id);
CREATE INDEX idx_project_collaborators_user ON project_collaborators(user_id);

-- ============================================
-- STEP 2: Add project_id and user tracking to PyArchInit tables
-- ============================================

-- Add project_id and created_by_user to site_table
ALTER TABLE site_table
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS created_by_user INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_site_table_project ON site_table(project_id);
CREATE INDEX IF NOT EXISTS idx_site_table_created_by ON site_table(created_by_user);

-- Add project_id and created_by_user to us_table
ALTER TABLE us_table
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS created_by_user INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_us_table_project ON us_table(project_id);
CREATE INDEX IF NOT EXISTS idx_us_table_created_by ON us_table(created_by_user);

-- Add project_id and created_by_user to media_table
ALTER TABLE media_table
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS created_by_user INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_media_table_project ON media_table(project_id);
CREATE INDEX IF NOT EXISTS idx_media_table_created_by ON media_table(created_by_user);

-- Add project_id and created_by_user to mobile_notes
ALTER TABLE mobile_notes
ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id),
ADD COLUMN IF NOT EXISTS created_by_user INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_mobile_notes_project ON mobile_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_mobile_notes_created_by ON mobile_notes(created_by_user);

-- ============================================
-- STEP 3: Create helper function for RLS
-- ============================================

-- Function to check if user has access to project
CREATE OR REPLACE FUNCTION user_has_project_access(p_project_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Get current user ID from session variable
    BEGIN
        v_user_id := current_setting('app.current_user_id')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    -- Check if user is collaborator on this project
    RETURN EXISTS (
        SELECT 1
        FROM project_collaborators
        WHERE project_id = p_project_id
        AND user_id = v_user_id
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- COMPLETED
-- ============================================

-- Note: Row-Level Security policies are added in migration 002
-- to allow for optional deployment (separate mode doesn't need RLS)
