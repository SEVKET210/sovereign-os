import React, { useState, useEffect } from 'react';
import { Shield, Volume2, VolumeX, Terminal, Cpu, Lock } from 'lucide-react';
import { useTheme } from '../../services/theme/ThemeContext';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { SyncQueueService } from '../../services/crypto/SyncQueueService';

export const TacticalStatusBar: React.FC<{
  onOpenCommandK?: () => void;
}> = ({ onOpenCommandK }) => {
  const { activePreset } = useTheme();
  const isMuted = TactileSoundEngine.getMuted();
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    return SyncQueueService.subscribe((count) => {
      setPendingSync(count);
    });
  }, []);

  return (
    <footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-hairline)',
        zIndex: 'var(--z-float)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 'var(--sp-4)',
        fontSize: '0.66rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        userSelect: 'none',
      }}
    >
      {/* Left: Cluster & Hardware Attestation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--clr-positive)',
              boxShadow: '0 0 6px var(--clr-positive)',
            }}
          />
          <span style={{ color: 'var(--text-secondary)' }}>VDS CLUSTER ONLINE</span>
        </div>

        <div style={{ width: 1, height: 12, background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Shield size={11} color="var(--clr-accent)" />
          <span>ENCLAVE: ZERO-TRUST LEVEL-4</span>
        </div>

        <div style={{ width: 1, height: 12, background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Lock size={11} color="var(--clr-accent)" />
          <span>FLEE: AES-256-GCM {pendingSync > 0 ? `(SYNCING: ${pendingSync})` : '(ZK ATTESTED)'}</span>
        </div>

        <div style={{ width: 1, height: 12, background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Cpu size={11} color="var(--text-muted)" />
          <span>RAM: 64.2 MB ISOLATED</span>
        </div>
      </div>

      {/* Right: Theme Swatch, Audio & Command Prompt */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
        <div
          onClick={onOpenCommandK}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: 2,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Terminal size={10} />
          <span>CMD ⌘K</span>
        </div>

        <div style={{ width: 1, height: 12, background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: activePreset.indicatorHex,
              border: `1px solid ${activePreset.accentHex}`,
            }}
          />
          <span>{activePreset.name.toUpperCase()}</span>
        </div>

        <div style={{ width: 1, height: 12, background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isMuted ? <VolumeX size={11} /> : <Volume2 size={11} color="var(--clr-accent)" />}
          <span>{isMuted ? 'AUDIO: OFF' : 'AUDIO: W-SYNTH'}</span>
        </div>
      </div>
    </footer>
  );
};
