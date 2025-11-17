-- Migration 002: Enable Row-Level Security (RLS)
-- ONLY FOR HYBRID MODE - Skip this for separate mode

-- ============================================
-- WARNING: This migration enables Row-Level Security
-- Only run if DB_MODE=hybrid in .env
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on PyArchInit tables
-- ============================================

-- Enable RLS on site_table
ALTER TABLE site_table ENABLE ROW LEVEL SECURITY;

-- Enable RLS on us_table
ALTER TABLE us_table ENABLE ROW LEVEL SECURITY;

-- Enable RLS on media_table
ALTER TABLE media_table ENABLE ROW LEVEL SECURITY;

-- Enable RLS on media_thumb_table
ALTER TABLE media_thumb_table ENABLE ROW LEVEL SECURITY;

-- Enable RLS on mobile_notes
ALTER TABLE mobile_notes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create RLS Policies for site_table
-- ============================================

-- Policy: Users can see sites from projects they collaborate on
CREATE POLICY site_table_select_policy ON site_table
    FOR SELECT
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

-- Policy: Users can insert sites into their projects
CREATE POLICY site_table_insert_policy ON site_table
    FOR INSERT
    WITH CHECK (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

-- Policy: Users can update sites in their projects
CREATE POLICY site_table_update_policy ON site_table
    FOR UPDATE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

-- Policy: Users can delete sites from their projects
CREATE POLICY site_table_delete_policy ON site_table
    FOR DELETE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

-- ============================================
-- STEP 3: Create RLS Policies for us_table
-- ============================================

CREATE POLICY us_table_select_policy ON us_table
    FOR SELECT
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY us_table_insert_policy ON us_table
    FOR INSERT
    WITH CHECK (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY us_table_update_policy ON us_table
    FOR UPDATE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY us_table_delete_policy ON us_table
    FOR DELETE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

-- ============================================
-- STEP 4: Create RLS Policies for media_table
-- ============================================

CREATE POLICY media_table_select_policy ON media_table
    FOR SELECT
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY media_table_insert_policy ON media_table
    FOR INSERT
    WITH CHECK (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY media_table_update_policy ON media_table
    FOR UPDATE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY media_table_delete_policy ON media_table
    FOR DELETE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

-- ============================================
-- STEP 5: Create RLS Policies for media_thumb_table
-- ============================================

-- For media_thumb_table, check if the associated media is accessible
CREATE POLICY media_thumb_table_select_policy ON media_thumb_table
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM media_table m
            WHERE m.id_media = media_thumb_table.id_media
            AND m.project_id IS NOT NULL
            AND user_has_project_access(m.project_id)
        )
    );

CREATE POLICY media_thumb_table_insert_policy ON media_thumb_table
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM media_table m
            WHERE m.id_media = media_thumb_table.id_media
            AND m.project_id IS NOT NULL
            AND user_has_project_access(m.project_id)
        )
    );

CREATE POLICY media_thumb_table_update_policy ON media_thumb_table
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM media_table m
            WHERE m.id_media = media_thumb_table.id_media
            AND m.project_id IS NOT NULL
            AND user_has_project_access(m.project_id)
        )
    );

CREATE POLICY media_thumb_table_delete_policy ON media_thumb_table
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM media_table m
            WHERE m.id_media = media_thumb_table.id_media
            AND m.project_id IS NOT NULL
            AND user_has_project_access(m.project_id)
        )
    );

-- ============================================
-- STEP 6: Create RLS Policies for mobile_notes
-- ============================================

CREATE POLICY mobile_notes_select_policy ON mobile_notes
    FOR SELECT
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY mobile_notes_insert_policy ON mobile_notes
    FOR INSERT
    WITH CHECK (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY mobile_notes_update_policy ON mobile_notes
    FOR UPDATE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

CREATE POLICY mobile_notes_delete_policy ON mobile_notes
    FOR DELETE
    USING (
        project_id IS NOT NULL
        AND user_has_project_access(project_id)
    );

-- ============================================
-- STEP 7: Grant necessary permissions
-- ============================================

-- Grant usage on sequences (for inserts)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- ============================================
-- COMPLETED
-- ============================================

-- Note: Remember to set app.current_user_id session variable
-- in your database connection for RLS to work properly
--
-- Example in Python:
-- session.execute(text(f"SET app.current_user_id = {user_id}"))
