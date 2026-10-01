/* ============================================================
   SOVEREIGN-OS — Kanban Column Swimlane
   Status swimlane container rendering filtered cards and stage telemetry.
   ============================================================ */

import React from 'react';
import { KanbanCard } from './KanbanCard';
import type { BlueprintNode, KanbanColumnConfig } from '../../types';

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  nodes: BlueprintNode[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, nodes }) => {
  return (
    <div
      style={{
        flex: '0 0 300px',
        minWidth: 280,
        maxWidth: 320,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: 'var(--sp-3) var(--sp-4)',
          borderBottom: '1px solid var(--border-hairline)',
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: column.color,
            }}
          />
          <h3
            className="type-title"
            style={{
              fontSize: 'var(--text-xs)',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {column.label}
          </h3>
        </div>

        <span
          style={{
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-moderate)',
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
          }}
        >
          {nodes.length}
        </span>
      </div>

      {/* Swimlane Cards Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--sp-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-3)',
        }}
      >
        {nodes.length > 0 ? (
          nodes.map((node) => <KanbanCard key={node.id} node={node} />)
        ) : (
          <div
            style={{
              padding: 'var(--sp-6) var(--sp-3)',
              textAlign: 'center',
              border: '1px dashed var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-2xs)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            STAGE EMPTY
          </div>
        )}
      </div>
    </div>
  );
};
