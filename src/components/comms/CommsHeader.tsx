import React from 'react';
import {
  Hash,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  AtSign,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { useTeamStore } from '../../stores/useTeamStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

export const CommsHeader: React.FC = () => {
  const activeChannelId = useCommsStore((state) => state.activeChannelId);
  const activeDirectOperatorId = useCommsStore((state) => state.activeDirectOperatorId);
  const channels = useCommsStore((state) => state.channels);
  const isRightDrawerOpen = useCommsStore((state) => state.isRightDrawerOpen);
  const toggleRightDrawer = useCommsStore((state) => state.toggleRightDrawer);
  const selectedMessageIds = useCommsStore((state) => state.selectedMessageIds);
  const clearMessageSelection = useCommsStore((state) => state.clearMessageSelection);
  const openSealingModal = useCommsStore((state) => state.openSealingModal);

  const operators = useTeamStore((state) => state.operators);
  const directOperator = activeDirectOperatorId
    ? operators.find((o) => o.id === activeDirectOperatorId)
    : null;

  const currentChannel = channels.find((c) => c.id === activeChannelId);

  const isDirect = !!directOperator;
  const title = isDirect ? directOperator.alias : currentChannel ? currentChannel.name : 'Unknown Channel';
  const topic = isDirect
    ? `${directOperator.role} // ${directOperator.department} — Direct Encrypted Line`
    : currentChannel?.topic || 'Encrypted Channel Relay';
  const clearance = isDirect ? directOperator.clearance : currentChannel?.clearance || 'LEVEL_1';

  return (
    <div
      style={{
        height: 48,
        minHeight: 48,
        paddingInline: 14,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* Left: Channel Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            background: isDirect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isDirect ? '#10b981' : '#60a5fa',
            flexShrink: 0,
          }}
        >
          {isDirect ? <AtSign size={13} /> : <Hash size={13} />}
        </div>

        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </span>

            <span
              style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                padding: '1px 5px',
                borderRadius: 2,
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              {clearance}
            </span>
          </div>

          <span
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 360,
            }}
          >
            {topic}
          </span>
        </div>
      </div>

      {/* Middle/Right: Multi-Select Decision Seal Bar OR Blind Relay Status */}
      {selectedMessageIds.length > 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(212, 175, 55, 0.14)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 8px',
          }}
        >
          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: '#fef3c7',
            }}
          >
            {selectedMessageIds.length} SELECTED
          </span>

          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              openSealingModal();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              background: 'rgba(212, 175, 55, 0.3)',
              border: '1px solid rgba(212, 175, 55, 0.6)',
              borderRadius: 2,
              color: '#fef3c7',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ShieldCheck size={11} />
            <span>SEAL TO LEDGER</span>
          </button>

          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              clearMessageSelection();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* ZK Relay Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              color: '#10b981',
            }}
          >
            <Lock size={10} />
            <span>ZK BLIND RELAY // AES-256-GCM</span>
          </div>

          {/* Toggle Right Artifact Drawer */}
          <button
            onClick={toggleRightDrawer}
            title={isRightDrawerOpen ? 'Collapse Artifact Drawer' : 'Expand Artifact Drawer'}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            {isRightDrawerOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </div>
      )}
    </div>
  );
};
