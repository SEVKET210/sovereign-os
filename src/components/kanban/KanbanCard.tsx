/* ============================================================
   SOVEREIGN-OS — Kanban Interactive Node Card
   High-density card reflecting live Blueprint node attributes,
   clearance badges, SLA countdown, and fluid stage migration.
   ============================================================ */

import React from 'react';
import {
  Clock,
  CheckSquare,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  User,
  DollarSign,
  BookOpen,
} from 'lucide-react';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { KANBAN_COLUMNS } from '../../stores/useKanbanStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { BlueprintNode, KanbanColumnId, TaskNodeData } from '../../types';

interface KanbanCardProps {
  node: BlueprintNode;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ node }) => {
  const { updateNodeStatus, setActiveDrawerNode } = useBlueprintStore();
  const { hasPermission, isIntern, isAuditor } = usePermissionStore();
  const canEdit = hasPermission('blueprint:edit');

  const isTask = node.type === 'task';
  const isBudget = node.type === 'budget';
  const isNarrative = node.type === 'narrative';
  const isVault = node.type === 'vaultFile';

  const taskData = isTask ? (node as TaskNodeData) : null;
  const checklist = taskData?.checklist || [];
  const completedCount = checklist.filter((c) => c.completed).length;

  const currentColumnIndex = KANBAN_COLUMNS.findIndex((c) => c.id === node.status);

  const handleMove = (direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit || isIntern() || isAuditor()) {
      showToast('Yetkisiz işlem: Görev aşamasını değiştirme yetkiniz yok.', 'warning');
      return;
    }
    const newIdx = direction === 'next' ? currentColumnIndex + 1 : currentColumnIndex - 1;
    if (newIdx >= 0 && newIdx < KANBAN_COLUMNS.length) {
      const targetStatus = KANBAN_COLUMNS[newIdx].id as KanbanColumnId;
      updateNodeStatus(node.id, targetStatus);
    }
  };

  const handleDoubleClick = () => {
    TactileSoundEngine.playClick();
    setActiveDrawerNode(node);
  };

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        padding: 'var(--sp-3)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-moderate)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-2)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--clr-accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-moderate)';
      }}
    >
      {/* Top Meta Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              padding: '2px 5px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(78, 242, 210, 0.08)',
              border: '1px solid rgba(78, 242, 210, 0.2)',
              color: 'var(--clr-accent)',
              fontSize: '0.58rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            {node.clearance}
          </span>

          <span
            style={{
              fontSize: '0.58rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {node.type}
          </span>
        </div>

        {/* Shift Controls */}
        {canEdit && !isIntern() && !isAuditor() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {currentColumnIndex > 0 && (
              <button
                type="button"
                onClick={(e) => handleMove('prev', e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                }}
                title="Move to previous stage"
              >
                <ChevronLeft size={13} />
              </button>
            )}

            {currentColumnIndex < KANBAN_COLUMNS.length - 1 && (
              <button
                type="button"
                onClick={(e) => handleMove('next', e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--clr-accent)',
                  cursor: 'pointer',
                  padding: 2,
                }}
                title="Promote to next stage"
              >
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Title */}
      <h4
        className="type-title"
        style={{
          fontSize: 'var(--text-xs)',
          margin: 0,
          lineHeight: 1.4,
          color: 'var(--text-primary)',
        }}
      >
        {node.title}
      </h4>

      {/* Specific Node Attributes */}
      {isTask && taskData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Subtasks Progress */}
          {checklist.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              <CheckSquare size={11} color="var(--clr-accent)" />
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {completedCount}/{checklist.length} subtasks
              </span>
            </div>
          )}

          {/* Assignee & SLA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: '0.62rem' }}>
              <User size={11} />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{taskData.assignee || 'Unassigned'}</span>
            </div>

            {taskData.slaCountdownSeconds && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.60rem',
                  fontFamily: 'var(--font-mono)',
                  color: taskData.priority === 'CRITICAL' ? 'var(--clr-danger)' : 'var(--clr-caution)',
                }}
              >
                <Clock size={10} />
                <span>{Math.round(taskData.slaCountdownSeconds / 3600)}h SLA</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isVault && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: 'var(--clr-accent)' }}>
          <HardDrive size={12} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>4 MB Chunked Enclave Artifact</span>
        </div>
      )}

      {isBudget && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: 'var(--clr-positive)' }}>
          <DollarSign size={12} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>Liquidity Ceiling Bound</span>
        </div>
      )}

      {isNarrative && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
          <BookOpen size={12} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>Corporate Strategy Milestone</span>
        </div>
      )}
    </div>
  );
};
