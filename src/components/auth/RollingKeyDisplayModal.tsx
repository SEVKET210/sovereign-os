import React, { useState, useEffect } from 'react';
import { KeyRound, RefreshCw, X, ShieldAlert, Copy, Check } from 'lucide-react';
import { RollingPasswordService } from '../../services/crypto/RollingPasswordService';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { RollingKeySession } from '../../types';

export const RollingKeyDisplayModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onInjectKey: (key: string) => void;
}> = ({ isOpen, onClose, onInjectKey }) => {
  const [session, setSession] = useState<RollingKeySession>({
    dynamicKeyFormatted: '---- ---- ----',
    ttlSecondsRemaining: 30,
    windowSizeSeconds: 30,
    sessionNonce: '0x00000000',
  });
  const [copied, setCopied] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    const fetchKey = async () => {
      try {
        const current = await RollingPasswordService.getCurrentRollingKey();
        if (!isMounted) return;
        setSession(current);
        setLockError(null);
        if (current.ttlSecondsRemaining === 30) {
          TactileSoundEngine.playRollingKeyRefresh();
        }
      } catch (err) {
        if (!isMounted) return;
        setLockError('ENCLAVE LOCKED: Authenticate master passphrase to unlock rolling dynamic keys.');
      }
    };

    fetchKey();
    const interval = setInterval(fetchKey, 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    TactileSoundEngine.playClick();
    navigator.clipboard.writeText(session.dynamicKeyFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInject = () => {
    TactileSoundEngine.playVaultLock();
    onInjectKey(session.dynamicKeyFormatted);
    onClose();
  };

  const progressPercent = (session.ttlSecondsRemaining / session.windowSizeSeconds) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-4)',
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Surface */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          zIndex: 1,
          animation: 'enter-scale var(--dur-fast) var(--ease-out) both',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-5)',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <KeyRound size={16} color="var(--clr-accent)" />
            <span className="type-title" style={{ fontSize: 'var(--text-sm)' }}>
              Burn-On-Read Dynamic Key Generator
            </span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {/* Warning Banner */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: lockError ? 'rgba(255, 75, 75, 0.15)' : 'var(--clr-caution-alpha)',
              border: `1px solid ${lockError ? 'var(--clr-negative)' : 'var(--clr-caution)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 'var(--text-xs)',
              color: 'var(--text-primary)',
            }}
          >
            <ShieldAlert size={15} color={lockError ? 'var(--clr-negative)' : 'var(--clr-caution)'} style={{ flexShrink: 0 }} />
            <span>{lockError || 'Single-use key expires upon ingestion or window timeout.'}</span>
          </div>

          {/* Dynamic Key Readout */}
          <div
            style={{
              padding: 'var(--sp-5)',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <span className="label-overline" style={{ display: 'block', marginBottom: 6 }}>
              CURRENT ACTIVE EPOCH KEY
            </span>
            <div
              className="tabular-nums"
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--clr-accent)',
                userSelect: 'all',
              }}
            >
              {session.dynamicKeyFormatted}
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              NONCE: {session.sessionNonce}
            </div>
          </div>

          {/* Countdown Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>EPOCH TIME REMAINING:</span>
              <span className="tabular-nums" style={{ color: session.ttlSecondsRemaining <= 5 ? 'var(--clr-negative)' : 'var(--clr-accent)' }}>
                {session.ttlSecondsRemaining}s / 30s
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: session.ttlSecondsRemaining <= 5 ? 'var(--clr-negative)' : 'var(--clr-accent)',
                  transition: 'width 1s linear',
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopy}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {copied ? <Check size={13} color="var(--clr-positive)" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy Key'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleInject}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <RefreshCw size={13} />
              Inject to Safe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
