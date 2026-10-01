import React from 'react';
import { DollarSign, AlertOctagon, Shield } from 'lucide-react';
import type { BudgetNodeData } from '../../../types';

export const BudgetNode: React.FC<{
  node: BudgetNodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (node: BudgetNodeData) => void;
}> = ({ node, isSelected, onSelect, onDoubleClick }) => {
  const isExhausted = node.spentAmount >= node.allocatedAmount;
  const percent = Math.min(100, Math.round((node.spentAmount / node.allocatedAmount) * 100));

  const formatAmount = (n: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: node.currency || 'USD', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node); }}
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--bg-secondary)',
        border: `1px solid ${isExhausted ? 'var(--clr-negative)' : isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
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
          background: isExhausted ? 'rgba(248, 113, 113, 0.15)' : 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DollarSign size={13} color={isExhausted ? 'var(--clr-negative)' : 'var(--clr-accent)'} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {node.title}
          </span>
        </div>
        {isExhausted && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.60rem',
              padding: '1px 5px',
              borderRadius: 2,
              background: 'var(--clr-negative)',
              color: '#ffffff',
              fontWeight: 600,
            }}
          >
            DOWNSTREAM BLOCKED
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--text-muted)' }}>CAPITAL CEILING:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatAmount(node.allocatedAmount)}</span>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>BURN RATIO:</span>
            <span style={{ color: isExhausted ? 'var(--clr-negative)' : 'var(--clr-accent)' }}>
              {percent}% ({formatAmount(node.spentAmount)})
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-primary)', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                width: `${percent}%`,
                height: '100%',
                background: isExhausted ? 'var(--clr-negative)' : 'var(--clr-accent)',
              }}
            />
          </div>
        </div>

        {isExhausted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.64rem', color: 'var(--clr-negative)', fontFamily: 'var(--font-mono)' }}>
            <AlertOctagon size={11} />
            <span>Exhausted: Downstream nodes frozen</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <Shield size={10} color="var(--clr-accent)" />
          <span>{node.clearance}</span>
        </div>
      </div>
    </div>
  );
};
