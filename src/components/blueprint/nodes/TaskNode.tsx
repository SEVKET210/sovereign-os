import React from 'react';
import { CheckSquare, Clock, Shield } from 'lucide-react';
import type { TaskNodeData } from '../../../types';

export const TaskNode: React.FC<{
  node: TaskNodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (node: TaskNodeData) => void;
}> = ({ node, isSelected, onSelect, onDoubleClick }) => {
  const completedCount = node.checklist.filter((c) => c.completed).length;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node); }}
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--bg-secondary)',
        border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'border-color var(--dur-fast) var(--ease-out)',
      }}
    >
      {/* Node Header */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckSquare size={13} color="var(--clr-accent)" />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {node.title}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            padding: '1px 5px',
            borderRadius: 2,
            background: 'var(--clr-accent-alpha)',
            color: 'var(--clr-accent)',
          }}
        >
          {node.priority}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Assignee & SLA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-muted)' }}>@{node.assignee}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--clr-caution)' }}>
            <Clock size={11} />
            <span>{Math.floor(node.slaCountdownSeconds / 3600)}h {Math.floor((node.slaCountdownSeconds % 3600) / 60)}m</span>
          </div>
        </div>

        {/* Checklist Summary */}
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
          Checklist: {completedCount} / {node.checklist.length} completed
        </div>

        {/* Clearance indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <Shield size={10} color="var(--clr-accent)" />
          <span>{node.clearance}</span>
        </div>
      </div>
    </div>
  );
};
