import React, { useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { CredentialRegistrationForm } from './CredentialRegistrationForm';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

interface CredentialInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'register' | 'login';
}

export const CredentialInputModal: React.FC<CredentialInputModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'register',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        TactileSoundEngine.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="credential-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-4)',
        background: 'rgba(5, 7, 12, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          TactileSoundEngine.playClick();
          onClose();
        }
      }}
    >
      <div
        className="anim-scale-in"
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px var(--clr-accent-alpha)',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: 'var(--sp-3) var(--sp-5)',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <ShieldCheck size={16} color="var(--clr-accent)" />
            <span
              id="credential-modal-title"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--text-primary)',
              }}
            >
              ZERO-KNOWLEDGE CREDENTIAL ENCLAVE
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              TactileSoundEngine.playClick();
              onClose();
            }}
            aria-label="Kapat"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 'var(--sp-5)' }}>
          <CredentialRegistrationForm
            initialMode={initialMode}
            onSuccess={() => {
              if (onSuccess) onSuccess();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
