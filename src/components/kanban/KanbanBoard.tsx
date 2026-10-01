/* ============================================================
   SOVEREIGN-OS — Bi-Directional Fluid Kanban Workspace
   High-density, card-driven Kanban operational view synchronized
   directly with the authoritative Blueprint DAG store.
   ============================================================ */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Plus,
  Search,
  GitBranch,
  Kanban as KanbanIcon,
} from 'lucide-react';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { useKanbanStore, KANBAN_COLUMNS } from '../../stores/useKanbanStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { isNodeVisibleToUser } from '../../utils/rbacFilter';
import { KanbanColumn } from './KanbanColumn';
import { NodeWorkspaceDrawer } from '../blueprint/NodeWorkspaceDrawer';
import { CreateNodeModal } from '../blueprint/CreateNodeModal';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { ClearanceLevel } from '../../types';

const CLEARANCE_RANKS: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

export const KanbanBoard: React.FC = () => {
  const {
    nodes,
    edges,
    activeClearance,
    setActiveClearance,
    activeDrawerNode,
    setActiveDrawerNode,
    updateNode,
    loadNodes,
  } = useBlueprintStore();

  const { getActiveRole, getActiveClearance, getCurrentAlias, hasPermission } = usePermissionStore();
  const activeRole = getActiveRole();
  const userClearance = getActiveClearance();
  const currentAlias = getCurrentAlias();
  const canCreateNode = hasPermission('blueprint:create');

  const { viewMode, setViewMode, searchFilter, setSearchFilter } = useKanbanStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadNodes();
  }, [loadNodes]);

  // Spatial Permission Masking with RBAC
  const currentClearanceRank = CLEARANCE_RANKS[activeClearance];
  const visibleNodes = nodes.filter((n) => {
    const clearanceMatch = CLEARANCE_RANKS[n.clearance] <= currentClearanceRank;
    const searchMatch = !searchFilter.trim() || n.title.toLowerCase().includes(searchFilter.toLowerCase());
    const rbacOk = isNodeVisibleToUser(n, activeRole, userClearance, currentAlias);
    return clearanceMatch && searchMatch && rbacOk;
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 52px - 28px - 34px)', // Account for Navbar (52px), Status bar (28px), Ticker (34px)
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ── Top HUD Toolbar ─────────────────────────────────── */}
      <div
        style={{
          padding: 'var(--sp-3) var(--sp-6)',
          borderBottom: '1px solid var(--border-hairline)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--sp-3)',
          zIndex: 10,
        }}
      >
        {/* Left: View Mode Switcher & Clearance Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          {/* View Segmented Control */}
          <div
            style={{
              display: 'flex',
              padding: 2,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-moderate)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'canvas' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('canvas')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem' }}
            >
              <GitBranch size={12} />
              Blueprint DAG
            </button>
            <button
              type="button"
              className={`btn btn-xs ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('kanban')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem' }}
            >
              <KanbanIcon size={12} />
              Kanban Matrix
            </button>
          </div>

          {/* Clearance Masking */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} color="var(--clr-accent)" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Clearance:</span>
            {(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4'] as ClearanceLevel[])
              .filter((lvl) => CLEARANCE_RANKS[lvl] <= CLEARANCE_RANKS[userClearance])
              .map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`btn btn-xs ${activeClearance === lvl ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveClearance(lvl)}
                  style={{ fontSize: '0.60rem', padding: '2px 7px' }}
                >
                  {lvl.replace('_', ' ')}
                </button>
              ))}
            {activeRole === 'Auditor' && (
              <span
                style={{
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--clr-caution)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                🔍 DENETÇİ / SALT-OKUNUR
              </span>
            )}
            {activeRole === 'Intern' && (
              <span
                style={{
                  fontSize: '0.6rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--clr-accent)',
                  background: 'rgba(78, 242, 210, 0.1)',
                  border: '1px solid rgba(78, 242, 210, 0.25)',
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                🎓 STAJYER / KISITLI
              </span>
            )}
          </div>
        </div>

        {/* Right: Search Filter & Add Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter cards..."
              style={{
                width: 180,
                padding: '4px 8px 4px 26px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <Search
              size={12}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>

          {canCreateNode && (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              onClick={() => setIsAddModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={12} />
              + Görev / Düğüm Ekle
            </button>
          )}
        </div>
      </div>

      {/* ── Swimlanes Canvas ────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          padding: 'var(--sp-4) var(--sp-6)',
          display: 'flex',
          gap: 'var(--sp-4)',
        }}
      >
        {KANBAN_COLUMNS.map((col) => {
          const colNodes = visibleNodes.filter((n) => n.status === col.id);
          return <KanbanColumn key={col.id} column={col} nodes={colNodes} />;
        })}
      </div>

      {/* Full Operational Node Creation Modal */}
      <CreateNodeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Contextual Tactical Workspace & AI Drawer */}
      <NodeWorkspaceDrawer
        node={activeDrawerNode}
        allNodes={nodes}
        allEdges={edges}
        onClose={() => setActiveDrawerNode(null)}
        onUpdateNode={(updated) => updateNode(updated)}
        onSealToLedger={(decision) => {
          TactileSoundEngine.playLedgerSealThud();
          showToast(`Decision sealed to ledger: ${decision}`, 'success');
        }}
      />
    </div>
  );
};
