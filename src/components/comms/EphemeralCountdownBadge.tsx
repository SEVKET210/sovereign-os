import React, { useEffect, useState } from 'react';
import { Flame, EyeOff, AlertTriangle } from 'lucide-react';
import { EphemeralMemoryManager } from '../../services/comms/EphemeralMemoryManager';
import type { EphemeralBurnMode } from '../../types';

interface EphemeralCountdownBadgeProps {
  messageId: string;
  burnMode: EphemeralBurnMode;
  initialSeconds?: number;
  isRead?: boolean;
  onReadClick?: () => void;
}

export const EphemeralCountdownBadge: React.FC<EphemeralCountdownBadgeProps> = ({
  messageId,
  burnMode,
  initialSeconds = 30,
  isRead = false,
  onReadClick,
}) => {
  const [remaining, setRemaining] = useState<number | null>(() =>
    EphemeralMemoryManager.getRemainingSeconds(messageId) ?? (burnMode === '30s' ? initialSeconds : null)
  );

  useEffect(() => {
    const unsubscribe = EphemeralMemoryManager.subscribe(() => {
      const rem = EphemeralMemoryManager.getRemainingSeconds(messageId);
      setRemaining(rem);
    });
    return unsubscribe;
  }, [messageId]);

  if (burnMode === 'none') return null;

  if (burnMode === 'burn_on_read' && !isRead) {
    return (
      <button
        onClick={onReadClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--radius-sm)',
          color: '#f87171',
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <EyeOff size={11} />
        <span>BURN-ON-READ // CLICK TO ACCESS</span>
      </button>
    );
  }

  const seconds = remaining ?? 0;
  const isUrgent = seconds <= 5;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        background: isUrgent ? 'rgba(239, 68, 68, 0.22)' : 'rgba(245, 158, 11, 0.14)',
        border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.4)'}`,
        borderRadius: 'var(--radius-sm)',
        color: isUrgent ? '#ef4444' : '#f59e0b',
        fontSize: '0.68rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        animation: isUrgent ? 'pulse 1s infinite' : 'none',
      }}
    >
      {isUrgent ? <AlertTriangle size={11} /> : <Flame size={11} />}
      <span>
        {burnMode === 'burn_on_read' ? 'BURNING POST-READ' : 'EPHEMERAL'} // {seconds}s TO ZEROIZATION
      </span>
    </div>
  );
};
