-- ============================================================
-- SOVEREIGN-OS: Zero-Knowledge Field-Level Envelope Encryption (FLEE) Schema
-- Threat Model: Database host & PostgreSQL superuser assumed 100% compromised.
-- Zero plaintext bytes may ever be stored or processed server-side.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. Sovereign Workspaces Enclave ────────────────────────
CREATE TABLE IF NOT EXISTS sovereign_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_token_hash TEXT UNIQUE NOT NULL,
    encrypted_workspace_dek BYTEA NOT NULL,
    blind_salt BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_token_hash ON sovereign_workspaces(workspace_token_hash);

-- ── 2. Blind Blueprint Nodes (Spatial DAG) ─────────────────
CREATE TABLE IF NOT EXISTS blind_blueprint_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES sovereign_workspaces(id) ON DELETE CASCADE,
    clearance_level INTEGER NOT NULL CHECK (clearance_level BETWEEN 1 AND 4),
    blind_index_tokens TEXT[] DEFAULT ARRAY[]::TEXT[],
    encrypted_envelope JSONB NOT NULL,
    node_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inverted Generalized Index (GIN) for exact-match search over encrypted keyword tokens
CREATE INDEX IF NOT EXISTS idx_blueprint_nodes_blind_tokens 
    ON blind_blueprint_nodes USING GIN (blind_index_tokens);

CREATE INDEX IF NOT EXISTS idx_blueprint_nodes_workspace 
    ON blind_blueprint_nodes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_blueprint_nodes_clearance 
    ON blind_blueprint_nodes(workspace_id, clearance_level);

-- ── 3. Blind Blueprint Edges (Kinetic Connectors) ───────────
CREATE TABLE IF NOT EXISTS blind_blueprint_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES sovereign_workspaces(id) ON DELETE CASCADE,
    encrypted_edge_data JSONB NOT NULL,
    source_node_id UUID NOT NULL REFERENCES blind_blueprint_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES blind_blueprint_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blueprint_edges_workspace 
    ON blind_blueprint_edges(workspace_id);

CREATE INDEX IF NOT EXISTS idx_blueprint_edges_nodes 
    ON blind_blueprint_edges(source_node_id, target_node_id);

-- ── 4. Blind Chained Ledger (Immutable Double-Entry) ───────
CREATE TABLE IF NOT EXISTS blind_chained_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES sovereign_workspaces(id) ON DELETE CASCADE,
    blind_vault_tag TEXT NOT NULL,
    encrypted_tx_envelope JSONB NOT NULL,
    previous_block_hash TEXT NOT NULL,
    current_block_hash TEXT UNIQUE NOT NULL,
    client_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chained_ledger_workspace 
    ON blind_chained_ledger(workspace_id);

CREATE INDEX IF NOT EXISTS idx_chained_ledger_vault_tag 
    ON blind_chained_ledger(workspace_id, blind_vault_tag);

CREATE INDEX IF NOT EXISTS idx_chained_ledger_curr_hash 
    ON blind_chained_ledger(current_block_hash);

-- ── 5. Immutability Enforcement Trigger ────────────────────
-- Enforces absolute append-only immutability for the financial ledger.
-- Any UPDATE or DELETE is strictly intercepted and throws a fatal exception.
CREATE OR REPLACE FUNCTION enforce_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Ledger entries are immutable and cannot be updated or deleted. Compensatory offsetting transactions required. Violation intercepted at timestamp %', NOW();
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_blind_chained_ledger_immutable ON blind_chained_ledger;

CREATE TRIGGER trg_blind_chained_ledger_immutable
BEFORE UPDATE OR DELETE ON blind_chained_ledger
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_immutability();

-- ── 6. Row-Level Security (RLS) Policies ───────────────────
ALTER TABLE sovereign_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE blind_blueprint_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blind_blueprint_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE blind_chained_ledger ENABLE ROW LEVEL SECURITY;

-- Workspace Enclave Isolation Policy
CREATE POLICY "Workspaces Isolated Enclave Access"
ON sovereign_workspaces
FOR ALL
USING (
    workspace_token_hash = coalesce(current_setting('request.jwt.claim.workspace_token_hash', true), '')
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Spatial Clearance Culling Policy for Nodes
-- Rejects level-4 nodes for operators with clearance below 4
CREATE POLICY "Spatial Clearance Node Culling Policy"
ON blind_blueprint_nodes
FOR ALL
USING (
    workspace_id IN (
        SELECT id FROM sovereign_workspaces 
        WHERE workspace_token_hash = coalesce(current_setting('request.jwt.claim.workspace_token_hash', true), '')
           OR current_setting('request.jwt.claim.role', true) = 'service_role'
    )
    AND clearance_level <= coalesce(current_setting('request.jwt.claim.clearance_level', true)::INTEGER, 4)
);

-- Edge Access Policy
CREATE POLICY "Edges Enclave Access Policy"
ON blind_blueprint_edges
FOR ALL
USING (
    workspace_id IN (
        SELECT id FROM sovereign_workspaces 
        WHERE workspace_token_hash = coalesce(current_setting('request.jwt.claim.workspace_token_hash', true), '')
           OR current_setting('request.jwt.claim.role', true) = 'service_role'
    )
);

-- Ledger Read & Append Policy (Inserts allowed, reads allowed, updates/deletes blocked by trigger)
CREATE POLICY "Ledger Append and Verify Policy"
ON blind_chained_ledger
FOR ALL
USING (
    workspace_id IN (
        SELECT id FROM sovereign_workspaces 
        WHERE workspace_token_hash = coalesce(current_setting('request.jwt.claim.workspace_token_hash', true), '')
           OR current_setting('request.jwt.claim.role', true) = 'service_role'
    )
);
