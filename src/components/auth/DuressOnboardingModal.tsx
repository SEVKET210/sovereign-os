/* ============================================================
   SOVEREIGN-OS — Duress Threat Protection Onboarding Modal
   Post-login, one-time educational onboarding for duress code
   configuration. Strict OpSec: preserves plausible deniability
   by keeping login interface entirely free of duress indicators.
   ============================================================ */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Info,
  ArrowRight,
  X,
} from 'lucide-react';
import { RollingPasswordService } from '../../services/crypto/RollingPasswordService';
import { CredentialAuthService } from '../../services/auth/CredentialAuthService';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { MemorySanitizer } from '../../services/crypto/MemorySanitizer';
import { showToast } from '../Toast';

export const DuressOnboardingModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [duressPin, setDuressPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user is authenticated in an active, non-decoy session
    const session = sessionStorage.getItem('sovereign-session');
    const isDecoy = session?.startsWith('decoy_') || sessionStorage.getItem('sovereign-decoy-mode') === 'true';
    const hasCompleted = localStorage.getItem('sovereign_duress_onboarding_completed') === 'true';

    if (session && !isDecoy && !hasCompleted) {
      // Small timeout to allow workspace to mount before presenting security modal
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!isOpen) return null;

  const handleDismiss = () => {
    TactileSoundEngine.playClick();
    localStorage.setItem('sovereign_duress_onboarding_completed', 'true');
    setIsOpen(false);
  };

  const handleSaveDuress = async (e: React.FormEvent) => {
    e.preventDefault();
    TactileSoundEngine.playClick();
    setErrorMessage('');

    const cleanPin = duressPin.trim();
    if (!cleanPin) {
      setErrorMessage('Lütfen geçerli bir acil durum tuzak şifresi veya PIN giriniz.');
      return;
    }

    if (cleanPin.length < 4) {
      setErrorMessage('Tuzak parolası en az 4 karakter veya hane olmalıdır.');
      return;
    }

    if (cleanPin !== confirmPin.trim()) {
      setErrorMessage('Girdiğiniz tuzak parolaları birbiriyle eşleşmiyor.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Generate salt and PBKDF2 verifier
      const dSalt = crypto.getRandomValues(new Uint8Array(32));
      const dVerifier = await RollingPasswordService.deriveDuressVerifierBytes(cleanPin, dSalt);
      const duressSaltHex = MemorySanitizer.bytesToHex(dSalt);
      const duressVerifierHex = MemorySanitizer.bytesToHex(dVerifier);

      // 2. Update active dynamic enclave operators if present
      const operators = RollingPasswordService.listEnrolledDynamicOperators();
      if (operators.length > 0) {
        const updated = operators.map((op) => ({
          ...op,
          duressSaltHex,
          duressVerifierHex,
        }));
        localStorage.setItem(
          RollingPasswordService.DYNAMIC_OPERATORS_STORAGE_KEY,
          JSON.stringify(updated)
        );
      }

      // 3. Update active credential envelope if present
      const activeEmail = sessionStorage.getItem('sovereign_last_user_email');
      if (activeEmail) {
        const env = CredentialAuthService.getEnvelopeByEmail(activeEmail);
        if (env) {
          env.duressSaltHex = duressSaltHex;
          env.duressVerifierHex = duressVerifierHex;
          localStorage.setItem(`sovereign_cred_${activeEmail.toLowerCase()}`, JSON.stringify(env));
        }
      }

      // 4. Mark onboarding as completed
      localStorage.setItem('sovereign_duress_onboarding_completed', 'true');
      TactileSoundEngine.playVaultLock();
      showToast('Acil Durum Tuzak Koruması Başarıyla Mühürlendi.', 'success');
      setIsOpen(false);
    } catch {
      setErrorMessage('Kriptografik tuzak verisi kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 5, 8, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-4)',
      }}
    >
      <div
        className="anim-scale-in"
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--clr-caution-alpha)',
                border: '1px solid var(--clr-caution)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldAlert size={16} color="var(--clr-caution)" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--text-primary)',
                }}
              >
                GÜVENLİK PROTOKOLÜ // TUZAK PAROLASI
              </div>
              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                Anti-Coercion Plausible Deniability Architecture
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Kapat"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content & Educational Copy */}
        <form onSubmit={handleSaveDuress} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Threat Model Explanation */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: 10,
            }}
          >
            <Info size={18} color="var(--clr-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Tehdit Modeli ve Makul İnkar Edilebilirlik:</strong>
              <div style={{ marginTop: 4 }}>
                Fiziksel zorlama, tehdit veya şantaj altında kasanızı açmaya zorlandığınız durumlar için tasarlanmıştır.
                Belirleyeceğiniz acil durum kodu kilit ekranında girildiğinde sistem saldırgana{' '}
                <span style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>asla hata veya alarm göstermez</span>.
                Arka planda sessizce acil durum kaydı oluşturulur ve içeriği sentetik sahte verilerden oluşan izole bir{' '}
                <strong>Decoy (Tuzak) Çalışma Alanı</strong> başlatılır.
              </div>
            </div>
          </div>

          {/* Duress Code Input */}
          <div>
            <label
              htmlFor="modal-duress-pin"
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              ACİL DURUM TUZAK PAROLASI / PIN
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="modal-duress-pin"
                type={showPin ? 'text' : 'password'}
                value={duressPin}
                onChange={(e) => setDuressPin(e.target.value)}
                placeholder="örn. 998811 veya ACIL-DURUM-GUVENLIK-99"
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 32px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm Duress Code */}
          <div>
            <label
              htmlFor="modal-duress-confirm"
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              TUZAK PAROLASINI DOĞRULA
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                id="modal-duress-confirm"
                type={showPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Tuzak parolasını tekrar giriniz..."
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 32px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--clr-negative)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
              paddingTop: 12,
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={handleDismiss}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.72rem' }}
            >
              Şimdilik Atla (Skip for Now)
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !duressPin.trim()}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.72rem',
                opacity: !duressPin.trim() ? 0.5 : 1,
              }}
            >
              <CheckCircle2 size={14} />
              {isSubmitting ? 'Mühürleniyor...' : 'Tuzak Protokolünü Mühürle'}
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
