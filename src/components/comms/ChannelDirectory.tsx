import React from 'react';
import {
  Hash,
  Shield,
} from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import type { ClearanceLevel, CommsChannel } from '../../types';

export const ChannelDirectory: React.FC = () => {
  const activeClearance = useCommsStore((state) => state.activeClearance);
  const setActiveClearance = useCommsStore((state) => state.setActiveClearance);
  const activeChannelId = useCommsStore((state) => state.activeChannelId);
  const selectChannel = useCommsStore((state) => state.selectChannel);
  const channels = useCommsStore((state) => state.channels);

  const { canAccessClearance, currentRole } = usePermissionStore();

  // Group channels by clearance type
  const publicChannels = channels.filter((c) => c.type === 'public');
  const departmentalChannels = channels.filter((c) => c.type === 'departmental');
  const executiveChannels = channels.filter((c) => c.type === 'executive');
  const sovereignChannels = channels.filter((c) => c.type === 'sovereign');

  const handleClearanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLvl = e.target.value as ClearanceLevel;
    if (!canAccessClearance(newLvl)) return;
    setActiveClearance(newLvl);
  };

  const renderChannelItem = (channel: CommsChannel) => {
    const isActive = activeChannelId === channel.id;

    return (
      <button
        key={channel.id}
        onClick={() => selectChannel(channel.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '5px 8px',
          borderRadius: 'var(--radius-sm)',
          background: isActive ? 'var(--bg-surface)' : 'transparent',
          border: `1px solid ${isActive ? 'var(--border-moderate)' : 'transparent'}`,
          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.74rem',
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.12s ease',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Hash
            size={12}
            style={{
              color: isActive ? 'var(--clr-accent)' : 'var(--text-muted)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {channel.name}
          </span>
        </div>

        {channel.unreadCount && channel.unreadCount > 0 ? (
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 8,
              background: 'var(--clr-accent)',
              color: '#000',
              flexShrink: 0,
            }}
          >
            {channel.unreadCount}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '10px 10px 6px 10px',
      }}
    >
      {/* Interactive Clearance Switcher (Direct testing of Zero-Knowledge Spatial Culling) */}
      <div
        style={{
          padding: '8px 10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Shield size={11} style={{ color: 'var(--clr-accent)' }} />
            <span>OPERATIONAL CLEARANCE</span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--clr-accent)',
                fontWeight: 600,
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '1px 5px',
                borderRadius: 2,
              }}
            >
              {currentRole.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                fontFamily: 'var(--font-mono)',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              SPATIAL CULLING ACTIVE
            </span>
          </div>
        </div>

        <select
          value={activeClearance}
          onChange={handleClearanceChange}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            padding: '4px 6px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {canAccessClearance('LEVEL_1') && <option value="LEVEL_1">LEVEL 1 — Standard Operator (Public Only)</option>}
          {canAccessClearance('LEVEL_2') && <option value="LEVEL_2">LEVEL 2 — Tactical Analyst (Departmental)</option>}
          {canAccessClearance('LEVEL_3') && <option value="LEVEL_3">LEVEL 3 — Treasury Controller (Executive)</option>}
          {canAccessClearance('LEVEL_4') && <option value="LEVEL_4">LEVEL 4 — Sovereign Founder (Black-Budget)</option>}
        </select>
      </div>

      {/* ── Section: Public Channels (Level 1) ───────────────── */}
      {publicChannels.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.64rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              fontWeight: 600,
              letterSpacing: '0.04em',
              paddingInline: 6,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>PUBLIC CHANNELS [L1]</span>
            <span style={{ fontSize: '0.58rem' }}>{publicChannels.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {publicChannels.map(renderChannelItem)}
          </div>
        </div>
      )}

      {/* ── Section: Departmental Channels (Level 2+) ────────── */}
      {departmentalChannels.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.64rem',
              fontFamily: 'var(--font-mono)',
              color: '#34d399',
              fontWeight: 600,
              letterSpacing: '0.04em',
              paddingInline: 6,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>DEPARTMENTAL DESKS [L2+]</span>
            <span style={{ fontSize: '0.58rem' }}>{departmentalChannels.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {departmentalChannels.map(renderChannelItem)}
          </div>
        </div>
      )}

      {/* ── Section: Executive Council (Level 3+) ───────────── */}
      {executiveChannels.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.64rem',
              fontFamily: 'var(--font-mono)',
              color: '#fbbf24',
              fontWeight: 600,
              letterSpacing: '0.04em',
              paddingInline: 6,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>EXECUTIVE COUNCIL [L3+]</span>
            <span style={{ fontSize: '0.58rem' }}>{executiveChannels.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {executiveChannels.map(renderChannelItem)}
          </div>
        </div>
      )}

      {/* ── Section: Black-Budget Sovereign (Level 4 Strictly) ─ */}
      {sovereignChannels.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.64rem',
              fontFamily: 'var(--font-mono)',
              color: '#f87171',
              fontWeight: 600,
              letterSpacing: '0.04em',
              paddingInline: 6,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>BLACK-BUDGET SOVEREIGN [L4]</span>
            <span style={{ fontSize: '0.58rem' }}>{sovereignChannels.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sovereignChannels.map(renderChannelItem)}
          </div>
        </div>
      )}
    </div>
  );
};
