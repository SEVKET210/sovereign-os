import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Lock } from 'lucide-react';
import type { DecisionSealBlock as DecisionSealBlockType } from '../../types';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

interface DecisionSealBlockProps {
  seal: DecisionSealBlockType;
}

export const DecisionSealBlock: React.FC<DecisionSealBlockProps> = ({ seal }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    TactileSoundEngine.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(seal.hash);
      setCopied(true);
      showToast('SHA-256 Ledger Hash copied to clipboard.', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = new Date(seal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      style={{
        marginTop: 10,
        position: 'relative',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, rgba(30, 38, 55, 0.9) 0%, rgba(18, 24, 38, 0.95) 100%)',
        border: '1px solid rgba(212, 175, 55, 0.45)', // Metallic brass/gold border
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Metallic Engraved Top Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.06) 100%)',
          borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} style={{ color: '#fbbf24' }} />
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#fef3c7',
            }}
          >
            IMMUTABLE TREASURY DECISION SEAL // BLOCK #{seal.blockIndex}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Lock size={10} style={{ color: '#fbbf24' }} />
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              color: '#fbbf24',
              fontWeight: 600,
            }}
          >
            HASH CHAIN VERIFIED
          </span>
        </div>
      </div>

      {/* Body Content */}
      <div style={{ padding: '8px 12px' }}>
        <div
          style={{
            fontSize: '0.76rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            marginBottom: 6,
            lineHeight: 1.4,
          }}
        >
          {seal.reason}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            paddingTop: 6,
            borderTop: '1px dashed rgba(212, 175, 55, 0.2)',
            fontSize: '0.66rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>SIGNATORY: <strong style={{ color: '#fef3c7' }}>{seal.signatory}</strong></span>
            <span>TIME: {formattedDate}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#fbbf24' }}>SHA-256:</span>
            <code
              style={{
                color: 'var(--text-secondary)',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '2px 5px',
                borderRadius: 3,
                fontSize: '0.64rem',
              }}
            >
              {seal.hash.slice(0, 18)}...
            </code>
            <button
              onClick={handleCopyHash}
              title="Copy full cryptographic digest"
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? '#10b981' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
