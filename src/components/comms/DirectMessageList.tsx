import React from 'react';
import { GitBranch, HardDrive, Landmark, Radio } from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { useTeamStore } from '../../stores/useTeamStore';

export const DirectMessageList: React.FC = () => {
  const operators = useTeamStore((state) => state.operators);
  const activeDirectOperatorId = useCommsStore((state) => state.activeDirectOperatorId);
  const selectDirectOperator = useCommsStore((state) => state.selectDirectOperator);

  const getTelemetryIcon = (module?: string) => {
    switch (module) {
      case 'Blueprint DAG':
        return <GitBranch size={10} style={{ color: '#60a5fa' }} />;
      case 'Secure Vault':
        return <HardDrive size={10} style={{ color: '#f59e0b' }} />;
      case 'Treasury OS':
        return <Landmark size={10} style={{ color: '#10b981' }} />;
      default:
        return <Radio size={10} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div style={{ padding: '8px 10px 14px 10px' }}>
      <div
        style={{
          fontSize: '0.64rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          fontWeight: 600,
          letterSpacing: '0.04em',
          paddingInline: 6,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>DIRECT OPERATOR RELAY</span>
        <span style={{ fontSize: '0.58rem' }}>{operators.length} ACTIVE</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {operators.map((op) => {
          const isSelected = activeDirectOperatorId === op.id;
          const isOnline = op.status === 'active';
          const act = op.currentActivity;

          return (
            <button
              key={op.id}
              onClick={() => selectDirectOperator(op.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                background: isSelected ? 'var(--bg-surface)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--border-moderate)' : 'transparent'}`,
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {/* Top row: Avatar + Alias + Clearance Pill */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <div style={{ position: 'relative', width: 14, height: 14, flexShrink: 0 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: isOnline ? '#10b981' : '#f59e0b',
                        boxShadow: isOnline ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                        position: 'absolute',
                        top: 3,
                        left: 3,
                      }}
                    />
                  </div>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {op.alias}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '0.6rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {op.clearance}
                </span>
              </div>

              {/* Bottom row: Live Operational Telemetry Chip */}
              {act && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    border: '1px solid var(--border-hairline)',
                    overflow: 'hidden',
                  }}
                >
                  {getTelemetryIcon(act.module)}
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {act.action} {act.targetLabel ? `[${act.targetLabel}]` : ''}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
