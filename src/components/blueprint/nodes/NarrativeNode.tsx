import React from 'react';
import { BookOpen, Milestone, Shield } from 'lucide-react';
import type { NarrativeNodeData } from '../../../types';

export const NarrativeNode: React.FC<{
  node: NarrativeNodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (node: NarrativeNodeData) => void;
}> = ({ node, isSelected, onSelect, onDoubleClick }) => {
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
          <BookOpen size={13} color="var(--clr-accent)" />
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
          CH {node.currentChapter}/{node.totalChapters}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
          <Milestone size={12} color="var(--clr-indicator)" />
          <span>{node.milestoneTitle}</span>
        </div>

        {/* Objectives */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {node.objectives.map((obj, i) => (
            <div key={i} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--clr-accent)' }}>›</span>
              <span>{obj}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <Shield size={10} color="var(--clr-accent)" />
          <span>{node.clearance}</span>
        </div>
      </div>
    </div>
  );
};
