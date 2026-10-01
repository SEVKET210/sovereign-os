import React, { useState } from 'react';
import { ShieldCheck, X, Lock, FileSignature, AlertTriangle } from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

export const DecisionSealingModal: React.FC = () => {
  const isSealingModalOpen = useCommsStore((state) => state.isSealingModalOpen);
  const closeSealingModal = useCommsStore((state) => state.closeSealingModal);
  const selectedMessageIds = useCommsStore((state) => state.selectedMessageIds);
  const sealSelectedMessages = useCommsStore((state) => state.sealSelectedMessages);

  const { hasPermission, getCurrentAlias, currentRole } = usePermissionStore();
  const canSeal = hasPermission('comms:seal_decision');

  const [reason, setReason] = useState('SOVEREIGN OS ARCHITECTURAL RATIFICATION PROTOCOL');
  const [isSealing, setIsSealing] = useState(false);

  if (!isSealingModalOpen) return null;

  const signatory = `${getCurrentAlias()} [${currentRole.toUpperCase()}]`;

  const handleConfirmSeal = async () => {
    if (!canSeal) {
      showToast('Yetki hatası: Karar mühürleme yetkiniz bulunmamaktadır.', 'error');
      return;
    }
    if (!reason.trim() || isSealing) return;
    setIsSealing(true);
    try {
      await sealSelectedMessages(reason.trim());
    } finally {
      setIsSealing(false);
      closeSealingModal();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={closeSealingModal}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-secondary)',
          border: '1px solid rgba(212, 175, 55, 0.5)', // Metallic brass highlight
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.05) 100%)',
            borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} style={{ color: '#fbbf24' }} />
            <span
              style={{
                fontSize: '0.84rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: '#fef3c7',
                letterSpacing: '0.04em',
              }}
            >
              EXECUTE IMMUTABLE DECISION SEAL
            </span>
          </div>

          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              closeSealingModal();
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
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(212, 175, 55, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
              display: 'flex',
              gap: 8,
            }}
          >
            <Lock size={15} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
            <span>
              This operation extracts message contents, timestamps, and signatures, computes a chained
              SHA-256 digest, and commits an immutable entry to the Treasury Double-Entry Ledger.
            </span>
          </div>

          {!canSeal && (
            <div
              style={{
                padding: '8px 10px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.72rem',
                color: '#f87171',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span>YETKİ YETERSİZ: Hazine mühürleme işlemi için Yönetici veya Kurucu yetkisi gereklidir.</span>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              RATIFICATION MANDATE / RESOLUTION REASON:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. WASM Attestation Pipeline Architectural Signoff"
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>AUTHORIZED SIGNATORY:</span>
            <span style={{ color: '#fef3c7', fontWeight: 700 }}>{signatory}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>SELECTED MESSAGES:</span>
            <span style={{ color: 'var(--clr-accent)', fontWeight: 700 }}>
              {selectedMessageIds.length} RECORD(S)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              closeSealingModal();
            }}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            CANCEL
          </button>

          <button
            onClick={handleConfirmSeal}
            disabled={isSealing || !reason.trim() || !canSeal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: canSeal ? 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)' : '#333',
              border: `1px solid ${canSeal ? '#fef3c7' : '#555'}`,
              borderRadius: 'var(--radius-sm)',
              color: canSeal ? '#000' : '#888',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: isSealing || !reason.trim() || !canSeal ? 'not-allowed' : 'pointer',
              opacity: canSeal ? 1 : 0.6,
              boxShadow: canSeal ? '0 2px 8px rgba(212, 175, 55, 0.4)' : 'none',
            }}
          >
            <FileSignature size={13} />
            <span>{isSealing ? 'SEALING RECORD...' : 'RATIFY & SEAL TO LEDGER (65Hz)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
