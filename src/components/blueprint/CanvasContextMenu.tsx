import React, { useEffect, useRef } from 'react';
import { GitBranch, FileKey, DollarSign, BookOpen, RotateCcw, Trash2 } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { BlueprintNodeType } from '../../types';

interface ContextMenuAction {
  type: 'add_node';
  nodeType: BlueprintNodeType;
  label: string;
  icon: React.ReactNode;
}

interface CanvasContextMenuProps {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  hasSelection: boolean;
  canAddNode?: boolean;
  canDeleteNode?: boolean;
  onAddNode: (type: BlueprintNodeType, worldX: number, worldY: number) => void;
  onDeleteSelected: () => void;
  onResetView: () => void;
  onClose: () => void;
}

const NODE_ACTIONS: ContextMenuAction[] = [
  { type: 'add_node', nodeType: 'task',        label: 'Task Node',          icon: <GitBranch size={13} /> },
  { type: 'add_node', nodeType: 'vaultFile',   label: 'Vault File Node',    icon: <FileKey size={13} /> },
  { type: 'add_node', nodeType: 'budget',      label: 'Budget Gate Node',   icon: <DollarSign size={13} /> },
  { type: 'add_node', nodeType: 'narrative',   label: 'Narrative Node',     icon: <BookOpen size={13} /> },
];

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  screenX,
  screenY,
  worldX,
  worldY,
  hasSelection,
  canAddNode = true,
  canDeleteNode = true,
  onAddNode,
  onDeleteSelected,
  onResetView,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Clamp menu so it doesn't overflow viewport
  const menuW = 200;
  const menuH = hasSelection ? 220 : 180;
  const clampedX = Math.min(screenX, window.innerWidth - menuW - 8);
  const clampedY = Math.min(screenY, window.innerHeight - menuH - 8);

  const menuItemStyle = (danger = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.72rem',
    fontFamily: 'var(--font-mono)',
    color: danger ? 'var(--clr-negative)' : 'var(--text-secondary)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background 0.1s ease, color 0.1s ease',
  });

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: clampedX,
        top: clampedY,
        zIndex: 99999,
        width: menuW,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-moderate)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        padding: '4px',
        backdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.08s ease-out forwards',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div
        style={{
          padding: '4px 10px 6px',
          fontSize: '0.6rem',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-hairline)',
          marginBottom: 4,
        }}
      >
        BLUEPRINT DAG // CONTEXT ACTIONS
      </div>

      {/* Node spawn actions */}
      {canAddNode && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ padding: '2px 10px', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 2 }}>
            SPAWN NODE AT CURSOR
          </div>
          {NODE_ACTIONS.map((action) => (
            <button
              key={action.nodeType}
              style={menuItemStyle()}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              }}
              onClick={() => {
                TactileSoundEngine.playClick();
                onAddNode(action.nodeType, worldX, worldY);
                onClose();
              }}
            >
              <span style={{ color: 'var(--clr-accent)', flexShrink: 0 }}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      {canAddNode && <div style={{ height: 1, background: 'var(--border-hairline)', marginInline: 8, marginBottom: 4 }} />}

      {/* Delete selection */}
      {hasSelection && canDeleteNode && (
        <button
          style={menuItemStyle(true)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
          onClick={() => {
            TactileSoundEngine.playSeismicWarning();
            onDeleteSelected();
            onClose();
          }}
        >
          <Trash2 size={13} />
          Delete Selected
          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-muted)' }}>Del</span>
        </button>
      )}

      {/* Reset view */}
      <button
        style={menuItemStyle()}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }}
        onClick={() => {
          TactileSoundEngine.playMechanicalTransient();
          onResetView();
          onClose();
        }}
      >
        <RotateCcw size={13} />
        Reset View
      </button>
    </div>
  );
};
