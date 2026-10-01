import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ExternalLink, CheckSquare, Square, Zap } from 'lucide-react';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { TaskNodeData } from '../../types';

interface EmbeddedBlueprintNodeProps {
  nodeId: string;
}

export const EmbeddedBlueprintNode: React.FC<EmbeddedBlueprintNodeProps> = ({ nodeId }) => {
  const navigate = useNavigate();
  const rawNode = useBlueprintStore((state) =>
    state.nodes.find((n) => n.id === nodeId)
  );
  const node = rawNode && rawNode.type === 'task' ? (rawNode as TaskNodeData) : undefined;
  const updateNode = useBlueprintStore((state) => state.updateNode);
  const setSelectedNodeId = useBlueprintStore((state) => state.setSelectedNodeId);
  const setViewMode = useKanbanStore((state) => state.setViewMode);

  if (!node) {
    return (
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
        }}
      >
        [BLUEPRINT NODE // ID: {nodeId} — ACCESS RESTRICTED OR DELETED]
      </div>
    );
  }

  const checklist = node.checklist || [];
  const completedCount = checklist.filter((c: { completed: boolean }) => c.completed).length;

  const handleToggleSubtask = async (checklistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    TactileSoundEngine.playClick();
    const updatedChecklist = checklist.map((item: { id: string; text: string; completed: boolean }) =>
      item.id === checklistId ? { ...item, completed: !item.completed } : item
    );
    await updateNode({
      ...node,
      checklist: updatedChecklist,
    });
  };

  const handleJumpToCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    TactileSoundEngine.playMechanicalTransient();
    setSelectedNodeId(node.id);
    setViewMode('canvas');
    navigate('/blueprint');
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: '10px 12px',
        background: 'rgba(var(--bg-secondary-raw, 13 22 40) / 0.75)',
        border: '1px solid var(--border-moderate)',
        borderRadius: 'var(--radius-md)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60a5fa',
              flexShrink: 0,
            }}
          >
            <GitBranch size={12} />
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.12)',
              padding: '2px 6px',
              borderRadius: 2,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            {node.priority || 'CRITICAL'}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: node.status === 'completed' ? '#10b981' : '#3b82f6',
              background: node.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
              padding: '2px 6px',
              borderRadius: 2,
            }}
          >
            {node.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Sub-tasks checklist */}
      {checklist.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          <div
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              marginBottom: 2,
            }}
          >
            TASK VERIFICATION ({completedCount}/{checklist.length} RESOLVED):
          </div>
          {checklist.map((item: { id: string; text: string; completed: boolean }) => (
            <div
              key={item.id}
              onClick={(e) => handleToggleSubtask(item.id, e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontSize: '0.72rem',
                color: item.completed ? 'var(--text-muted)' : 'var(--text-secondary)',
                textDecoration: item.completed ? 'line-through' : 'none',
                userSelect: 'none',
              }}
            >
              {item.completed ? (
                <CheckSquare size={13} style={{ color: '#10b981', flexShrink: 0 }} />
              ) : (
                <Square size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              )}
              <span style={{ lineHeight: 1.3 }}>{item.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-hairline)',
          paddingTop: 6,
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          X: {node.x}px // Y: {node.y}px
        </span>

        <button
          onClick={handleJumpToCanvas}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--clr-accent)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Zap size={11} />
          <span>JUMP TO CANVAS</span>
          <ExternalLink size={10} />
        </button>
      </div>
    </div>
  );
};
