import React from 'react';
import { Radio } from 'lucide-react';
import { ChannelDirectory } from '../components/comms/ChannelDirectory';
import { DirectMessageList } from '../components/comms/DirectMessageList';
import { CommsHeader } from '../components/comms/CommsHeader';
import { MessageStream } from '../components/comms/MessageStream';
import { MessageComposer } from '../components/comms/MessageComposer';
import { CommsArtifactDrawer } from '../components/comms/CommsArtifactDrawer';
import { DecisionSealingModal } from '../components/comms/DecisionSealingModal';
import { RamPreviewModal } from '../components/comms/RamPreviewModal';

export const CommsEnclave: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        background: 'var(--bg-primary)',
      }}
    >
      {/* ── Left Column: Security Clearance Directory & Active DMs ── */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          height: '100%',
          borderRight: '1px solid var(--border-hairline)',
          background: 'var(--bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Left Column Brand / Telemetry Header */}
        <div
          style={{
            height: 48,
            minHeight: 48,
            paddingInline: 14,
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Radio size={14} style={{ color: 'var(--clr-accent)' }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
              }}
            >
              ENCLAVE RELAY
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            <span
              style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              ONLINE
            </span>
          </div>
        </div>

        {/* Scrollable Directories */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ChannelDirectory />
          <div style={{ height: 1, background: 'var(--border-hairline)', marginInline: 10, marginBlock: 4 }} />
          <DirectMessageList />
        </div>
      </aside>

      {/* ── Center Column: High-Density Conversation Viewport ── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-primary)',
          position: 'relative',
        }}
      >
        <CommsHeader />
        <MessageStream />
        <MessageComposer />
      </main>

      {/* ── Right Column: Collapsible Channel Artifact Index ── */}
      <CommsArtifactDrawer />

      {/* Global Comms Modals */}
      <DecisionSealingModal />
      <RamPreviewModal />
    </div>
  );
};
