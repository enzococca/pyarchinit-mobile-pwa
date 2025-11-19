-- Migration: Add Multi-Project Support
-- Description: Aggiunge tabelle per gestione progetti multi-utente con database configurabili
-- Date: 2025-01-19

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
-- Ogni progetto ha la propria configurazione database (SQLite o PostgreSQL)

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Database Configuration (dynamically selected)
    db_mode VARCHAR(20) NOT NULL CHECK (db_mode IN ('sqlite', 'postgres', 'hybrid')),
    db_config TEXT NOT NULL,  -- JSON: {"path": "..."} or {"host": "...", "port": 5432, ...}

    -- Project Type
    is_personal BOOLEAN DEFAULT FALSE,  -- TRUE for personal workspace

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_personal ON projects(is_personal);


-- ============================================================================
-- PROJECT TEAMS TABLE
-- ============================================================================
-- Gestisce l'accesso multi-utente ai progetti

CREATE TABLE IF NOT EXISTS project_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role in project
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

    -- Permissions (JSON)
    permissions TEXT,  -- {"can_edit": true, "can_delete": false, "can_invite": false}

    -- Timestamps
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique user per project
    UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_teams_project ON project_teams(project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_user ON project_teams(user_id);


-- ============================================================================
-- TRIGGER: Update updated_at on projects
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;


-- ============================================================================
-- DEFAULT PERMISSIONS TEMPLATE
-- ============================================================================
-- Permessi di default per ruoli

-- Owner: full access
-- Admin: can edit, delete, invite
-- Member: can edit
-- Viewer: read-only
