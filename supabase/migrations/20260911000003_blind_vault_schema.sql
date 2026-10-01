-- ============================================================
-- SOVEREIGN-OS: Blind Vault Manifests & Spatial Clearance Culling
-- Operational Sprint Two — Schema Migration
-- ============================================================

CREATE TABLE IF NOT EXISTS blind_vault_manifests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES sovereign_workspaces(id) ON DELETE CASCADE,
    clearance_level INT NOT NULL DEFAULT 1 CHECK (clearance_level BETWEEN 1 AND 4),
    blind_search_tokens TEXT[] DEFAULT '{}',
    encrypted_manifest JSONB NOT NULL,
    manifest_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_workspace ON blind_vault_manifests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_vault_clearance ON blind_vault_manifests(clearance_level);
CREATE INDEX IF NOT EXISTS idx_vault_search ON blind_vault_manifests USING GIN(blind_search_tokens);

ALTER TABLE blind_vault_manifests ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_vault_clearance_culling ON blind_vault_manifests
    FOR ALL
    USING (
        clearance_level <= NULLIF(current_setting('app.current_clearance_level', true), '')::integer
    );
