/* ============================================================
   SOVEREIGN-OS — Credential Registration & Authentication Form
   Modular, accessible, titanium enclave dark theme aesthetic
   Real-time password Shannon entropy meter, RFC email verification,
   and zero-knowledge envelope cryptographic submission.
   ============================================================ */

import React, { useState, useMemo } from 'react';
import {
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building,
  KeyRound,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validatePasswordConfirmation,
  evaluatePasswordStrength,
} from '../../utils/credentialValidation';
import { CredentialAuthService } from '../../services/auth/CredentialAuthService';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import { GoogleOAuthService } from '../../services/auth/GoogleOAuthService';
import type { AuthMode, CredentialRegistrationFormState } from '../../types/auth';

interface CredentialRegistrationFormProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
  onCancel?: () => void;
  standalone?: boolean;
}

export const CredentialRegistrationForm: React.FC<CredentialRegistrationFormProps> = ({
  initialMode = 'register',
  onSuccess,
  onCancel,
  standalone = false,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [lang, setLang] = useState<'tr' | 'en'>('tr');

  // Form inputs
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [workspaceMode, setWorkspaceMode] = useState<'PERSONAL_SANDBOX' | 'ENTERPRISE_NODE'>('PERSONAL_SANDBOX');
  const [companyName, setCompanyName] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Touched states for deferred error display
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // 2FA Challenge state during login
  const [isTotpChallengeStep, setIsTotpChallengeStep] = useState(false);
  const [totpChallengeCode, setTotpChallengeCode] = useState('');

  // Loading & Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // ── Real-Time Validations ────────────────────────────────────
  const emailValidation = useMemo(() => validateEmail(email), [email]);
  const usernameValidation = useMemo(() => validateUsername(username), [username]);
  const passwordValidation = useMemo(
    () => validatePassword(password, { username, email }),
    [password, username, email]
  );
  const confirmPasswordValidation = useMemo(
    () => validatePasswordConfirmation(password, confirmPassword),
    [password, confirmPassword]
  );

  // Dynamic Password Strength Evaluation
  const passwordStrength = useMemo(
    () => evaluatePasswordStrength(password, { username, email }),
    [password, username, email]
  );

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const togglePasswordVisibility = () => {
    TactileSoundEngine.playClick();
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmVisibility = () => {
    TactileSoundEngine.playClick();
    setShowConfirmPassword((prev) => !prev);
  };

  const handleSwitchMode = (newMode: AuthMode) => {
    TactileSoundEngine.playClick();
    setMode(newMode);
    setGeneralError(null);
  };

  // ── Form Submit Handler ──────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    TactileSoundEngine.playClick();
    setGeneralError(null);

    if (mode === 'register') {
      // Mark all fields as touched
      setTouched({ email: true, username: true, password: true, confirmPassword: true });

      if (
        !emailValidation.isValid ||
        !usernameValidation.isValid ||
        !passwordValidation.isValid ||
        !confirmPasswordValidation.isValid
      ) {
        TactileSoundEngine.playSeismicWarning();
        const firstErr =
          (lang === 'tr' ? emailValidation.errorMessageTr : emailValidation.errorMessageEn) ||
          (lang === 'tr' ? usernameValidation.errorMessageTr : usernameValidation.errorMessageEn) ||
          (lang === 'tr' ? passwordValidation.errorMessageTr : passwordValidation.errorMessageEn) ||
          (lang === 'tr' ? confirmPasswordValidation.errorMessageTr : confirmPasswordValidation.errorMessageEn);
        setGeneralError(firstErr || (lang === 'tr' ? 'Lütfen formu eksiksiz ve hatasız doldurunuz.' : 'Please fix errors.'));
        return;
      }

      setIsSubmitting(true);
      try {
        const payload: CredentialRegistrationFormState = {
          email: emailValidation.sanitizedValue,
          username: usernameValidation.sanitizedValue,
          password: password.trim(),
          confirmPassword: confirmPassword.trim(),
          workspaceMode,
          companyName: workspaceMode === 'ENTERPRISE_NODE' ? companyName.trim() : undefined,
          role: 'Founder',
        };

        const result = await CredentialAuthService.register(payload);
        if (!result.success) {
          TactileSoundEngine.playSeismicWarning();
          setGeneralError(lang === 'tr' ? result.errorTr || 'Kayıt başarısız.' : result.errorEn || 'Registration failed.');
          return;
        }

        TactileSoundEngine.playVaultLock();
        showToast(
          lang === 'tr'
            ? 'Sıfır-Bilgi Enklavı Başarıyla Oluşturuldu!'
            : 'Zero-Knowledge Enclave Registered Successfully!',
          'success'
        );
        onSuccess?.();
      } catch (err) {
        TactileSoundEngine.playSeismicWarning();
        setGeneralError(err instanceof Error ? err.message : 'Kriptografik hata oluştu.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Login mode
      if (isTotpChallengeStep) {
        if (!totpChallengeCode.trim()) {
          TactileSoundEngine.playSeismicWarning();
          setGeneralError(
            lang === 'tr' ? 'Lütfen 30 saniyelik dinamik TOTP kodunu giriniz.' : 'Please enter the 30-second TOTP code.'
          );
          return;
        }

        setIsSubmitting(true);
        try {
          const result = await CredentialAuthService.authenticate(
            loginIdentifier,
            password,
            totpChallengeCode.trim()
          );

          if (!result.success) {
            TactileSoundEngine.playSeismicWarning();
            setGeneralError(lang === 'tr' ? result.errorTr || 'Geçersiz kod.' : result.errorEn || 'Invalid code.');
            return;
          }

          TactileSoundEngine.playVaultLock();
          showToast(
            lang === 'tr' ? 'Kimlik doğrulandı — Enklav kilidi açıldı.' : 'Authenticated — Enclave unlocked.',
            'success'
          );
          onSuccess?.();
        } catch (err) {
          TactileSoundEngine.playSeismicWarning();
          setGeneralError(err instanceof Error ? err.message : 'Doğrulama hatası.');
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      setTouched({ loginIdentifier: true, password: true });

      if (!loginIdentifier.trim() || !password.trim()) {
        TactileSoundEngine.playSeismicWarning();
        setGeneralError(
          lang === 'tr' ? 'Lütfen e-posta/kullanıcı adı ve şifrenizi giriniz.' : 'Please provide identifier and password.'
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await CredentialAuthService.authenticate(loginIdentifier, password);

        if (result.totpRequired) {
          setIsTotpChallengeStep(true);
          setGeneralError(null);
          TactileSoundEngine.playClick();
          showToast(
            lang === 'tr' ? '30 Saniyelik Dinamik TOTP kodu gereklidir.' : '30-second Dynamic TOTP code required.',
            'info'
          );
          return;
        }

        if (!result.success) {
          TactileSoundEngine.playSeismicWarning();
          setGeneralError(
            lang === 'tr'
              ? result.errorTr || 'Kimlik doğrulama başarısız.'
              : result.errorEn || 'Authentication failed.'
          );
          return;
        }

        TactileSoundEngine.playVaultLock();
        showToast(
          lang === 'tr' ? 'Kimlik doğrulandı — Enklav kilidi açıldı.' : 'Authenticated — Enclave unlocked.',
          'success'
        );
        onSuccess?.();
      } catch (err) {
        TactileSoundEngine.playSeismicWarning();
        setGeneralError(err instanceof Error ? err.message : 'Doğrulama hatası.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ── Password Strength Bar Colors ─────────────────────────────
  const getStrengthBarColor = (score: number) => {
    switch (score) {
      case 1:
        return '#f97316'; // Orange - Weak
      case 2:
        return '#eab308'; // Yellow - Fair
      case 3:
        return '#10b981'; // Green - Strong
      case 4:
        return '#06b6d4'; // Cyan - Sovereign
      default:
        return '#ef4444'; // Red - Very Weak
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        background: standalone ? 'var(--bg-surface)' : 'transparent',
        border: standalone ? '1px solid var(--border-subtle)' : 'none',
        borderRadius: 'var(--radius-lg)',
        padding: standalone ? 24 : 0,
        boxShadow: standalone ? '0 16px 48px rgba(0,0,0,0.6)' : 'none',
      }}
    >
      {/* Top Header: Mode Switcher & Language Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-secondary)',
            padding: 3,
            borderRadius: 'var(--radius-sm)',
            gap: 4,
          }}
        >
          <button
            type="button"
            onClick={() => handleSwitchMode('register')}
            style={{
              padding: '5px 14px',
              borderRadius: 3,
              border: 'none',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: mode === 'register' ? 700 : 500,
              background: mode === 'register' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'register' ? 'var(--clr-accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {lang === 'tr' ? 'YENİ KAYIT' : 'REGISTER'}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchMode('login')}
            style={{
              padding: '5px 14px',
              borderRadius: 3,
              border: 'none',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: mode === 'login' ? 700 : 500,
              background: mode === 'login' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'login' ? 'var(--clr-accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {lang === 'tr' ? 'GİRİŞ YAP' : 'SIGN IN'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            TactileSoundEngine.playClick();
            setLang((l) => (l === 'tr' ? 'en' : 'tr'));
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px 8px',
            fontSize: '0.64rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          title="Toggle Language (TR / EN)"
        >
          {lang === 'tr' ? 'TR ⇋ EN' : 'EN ⇋ TR'}
        </button>
      </div>

      {/* General Error Banner */}
      {generalError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#f87171',
            fontSize: '0.74rem',
            fontFamily: 'var(--font-sans)',
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, color: '#ef4444' }} />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* ── REGISTER MODE FIELDS ── */}
        {mode === 'register' ? (
          <>
            {/* Field 1: Email Address */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="credential-email"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <span>{lang === 'tr' ? 'KURUMSAL E-POSTA ADRESİ' : 'CORPORATE EMAIL ADDRESS'}</span>
                {touched.email && (
                  emailValidation.isValid ? (
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.62rem' }}>
                      <CheckCircle2 size={11} /> RFC OK
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.62rem' }}>
                      <XCircle size={11} /> RFC ERROR
                    </span>
                  )
                )}
              </label>

              <div style={{ position: 'relative' }}>
                <Mail
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="credential-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="operator@sovereign.enterprise"
                  aria-invalid={touched.email && !emailValidation.isValid}
                  aria-describedby={touched.email && !emailValidation.isValid ? 'credential-email-error' : undefined}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      touched.email && !emailValidation.isValid ? '#ef4444' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                />
              </div>

              {touched.email && !emailValidation.isValid && (
                <div
                  id="credential-email-error"
                  style={{
                    fontSize: '0.64rem',
                    color: '#f87171',
                    marginTop: 4,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {lang === 'tr' ? emailValidation.errorMessageTr : emailValidation.errorMessageEn}
                </div>
              )}
            </div>

            {/* Field 2: Username / Alias */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="credential-username"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <span>{lang === 'tr' ? 'OPERATÖR KULLANICI ADI' : 'OPERATOR USERNAME / ALIAS'}</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>3-32 chars [a-z0-9_.-]</span>
              </label>

              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="credential-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => handleBlur('username')}
                  placeholder="e.g. quantum_sentinel"
                  aria-invalid={touched.username && !usernameValidation.isValid}
                  aria-describedby={touched.username && !usernameValidation.isValid ? 'credential-username-error' : undefined}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      touched.username && !usernameValidation.isValid ? '#ef4444' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>

              {touched.username && !usernameValidation.isValid && (
                <div
                  id="credential-username-error"
                  style={{
                    fontSize: '0.64rem',
                    color: '#f87171',
                    marginTop: 4,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {lang === 'tr' ? usernameValidation.errorMessageTr : usernameValidation.errorMessageEn}
                </div>
              )}
            </div>

            {/* Field 3: Master Password with Strength & Criteria */}
            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <label htmlFor="credential-password">{lang === 'tr' ? 'ANA ŞİFRE' : 'MASTER PASSPHRASE'}</label>
                {password && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: getStrengthBarColor(passwordStrength.score),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Sparkles size={10} />
                    {passwordStrength.level.toUpperCase()} ({passwordStrength.entropyBits} bits)
                  </span>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="credential-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder={lang === 'tr' ? 'En az 12 karakter, güçlü şifre...' : 'Minimum 12 characters, strong passphrase...'}
                  aria-invalid={touched.password && !passwordValidation.isValid}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 34px',
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      touched.password && !passwordValidation.isValid ? '#ef4444' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Dynamic Password Strength Progress Bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div
                    style={{
                      height: 4,
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      display: 'flex',
                      gap: 2,
                    }}
                  >
                    {[1, 2, 3, 4].map((barIndex) => (
                      <div
                        key={barIndex}
                        style={{
                          flex: 1,
                          height: '100%',
                          background:
                            passwordStrength.score >= barIndex
                              ? getStrengthBarColor(passwordStrength.score)
                              : 'transparent',
                          transition: 'background-color 0.25s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* Criteria Checklist Chips */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4,
                      marginTop: 8,
                    }}
                  >
                    {[
                      { key: 'hasMinLength', labelTr: '12+ Karakter', labelEn: '12+ Chars' },
                      { key: 'hasUppercase', labelTr: 'Büyük (A-Z)', labelEn: 'Upper (A-Z)' },
                      { key: 'hasLowercase', labelTr: 'Küçük (a-z)', labelEn: 'Lower (a-z)' },
                      { key: 'hasNumber', labelTr: 'Rakam (0-9)', labelEn: 'Digit (0-9)' },
                      { key: 'hasSpecial', labelTr: 'Sembol (!@#$)', labelEn: 'Symbol (!@#$)' },
                    ].map((item) => {
                      const met = passwordStrength.criteria[item.key as keyof typeof passwordStrength.criteria];
                      return (
                        <span
                          key={item.key}
                          style={{
                            fontSize: '0.6rem',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            borderRadius: 2,
                            background: met ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${met ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-hairline)'}`,
                            color: met ? '#10b981' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          {met ? '✓' : '•'} {lang === 'tr' ? item.labelTr : item.labelEn}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {touched.password && !passwordValidation.isValid && (
                <div
                  style={{
                    fontSize: '0.64rem',
                    color: '#f87171',
                    marginTop: 4,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {lang === 'tr' ? passwordValidation.errorMessageTr : passwordValidation.errorMessageEn}
                </div>
              )}
            </div>

            {/* Field 4: Password Confirmation */}
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="credential-confirm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <span>{lang === 'tr' ? 'ŞİFRE TEKRARI' : 'CONFIRM PASSPHRASE'}</span>
                {confirmPassword && (
                  confirmPasswordValidation.isValid ? (
                    <span style={{ color: '#10b981', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 size={11} />
                      {lang === 'tr' ? 'Eşleşti' : 'Matched'}
                    </span>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <XCircle size={11} />
                      {lang === 'tr' ? 'Eşleşmedi' : 'Mismatch'}
                    </span>
                  )
                )}
              </label>

              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="credential-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder={lang === 'tr' ? 'Şifrenizi tekrar yazınız...' : 'Re-enter master passphrase...'}
                  aria-invalid={touched.confirmPassword && !confirmPasswordValidation.isValid}
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 34px',
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${
                      touched.confirmPassword && !confirmPasswordValidation.isValid ? '#ef4444' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={toggleConfirmVisibility}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {touched.confirmPassword && !confirmPasswordValidation.isValid && (
                <div
                  style={{
                    fontSize: '0.64rem',
                    color: '#f87171',
                    marginTop: 4,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {lang === 'tr' ? confirmPasswordValidation.errorMessageTr : confirmPasswordValidation.errorMessageEn}
                </div>
              )}
            </div>

            {/* Field 5: Workspace Topology Selection (Personal vs Enterprise) */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                {lang === 'tr' ? 'ÇALIŞMA ALANI MİMARİSİ' : 'WORKSPACE ARCHITECTURE'}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setWorkspaceMode('PERSONAL_SANDBOX');
                  }}
                  style={{
                    padding: '8px 10px',
                    background: workspaceMode === 'PERSONAL_SANDBOX' ? 'var(--bg-surface)' : 'var(--bg-secondary)',
                    border: `1px solid ${
                      workspaceMode === 'PERSONAL_SANDBOX' ? 'var(--clr-accent)' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lang === 'tr' ? 'Bireysel Sandbox' : 'Solo Sandbox'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {lang === 'tr' ? 'Yalnızca bu cihazda izole' : 'Isolated local node'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setWorkspaceMode('ENTERPRISE_NODE');
                  }}
                  style={{
                    padding: '8px 10px',
                    background: workspaceMode === 'ENTERPRISE_NODE' ? 'var(--bg-surface)' : 'var(--bg-secondary)',
                    border: `1px solid ${
                      workspaceMode === 'ENTERPRISE_NODE' ? 'var(--clr-accent)' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lang === 'tr' ? 'Şirket / Enklav' : 'Enterprise Enclave'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {lang === 'tr' ? 'Çoklu operatör & davet' : 'Multi-operator & invites'}
                  </div>
                </button>
              </div>

              {workspaceMode === 'ENTERPRISE_NODE' && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <Building
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={lang === 'tr' ? 'Şirket veya Kurum Adı...' : 'Enterprise Organization Name...'}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 34px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : isTotpChallengeStep ? (
          /* ── LOGIN MODE 2FA CHALLENGE STEP ── */
          <div style={{ marginBottom: 18 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 10,
                  borderRadius: '50%',
                  background: 'var(--clr-accent-alpha)',
                  marginBottom: 8,
                  border: '1px solid var(--border-accent)',
                }}
              >
                <Clock size={24} color="var(--clr-accent)" />
              </div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {lang === 'tr' ? '30 SANİYELİK DİNAMİK GÜVENLİK KODU' : '30-SECOND DYNAMIC TOTP TOKEN'}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {lang === 'tr'
                  ? 'Kimlik doğrulayıcınızdaki güncel 6 haneli veya 12 karakterli dinamik kodu giriniz:'
                  : 'Enter the active 6-digit or 12-char rolling token from your device:'}
              </div>
            </div>

            <input
              type="text"
              id="totp-challenge-input"
              value={totpChallengeCode}
              onChange={(e) => setTotpChallengeCode(e.target.value.toUpperCase())}
              placeholder="örn: 849-210 veya A9F1-44B2-99D0"
              maxLength={19}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--clr-accent)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--clr-accent)',
                fontSize: '1rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                outline: 'none',
                boxShadow: '0 0 15px var(--clr-accent-alpha)',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setIsTotpChallengeStep(false);
                  setTotpChallengeCode('');
                  setGeneralError(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.66rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {lang === 'tr' ? '← Şifre Girişine Geri Dön' : '← Back to Password'}
              </button>
            </div>
          </div>
        ) : (
          /* ── LOGIN MODE FIELDS ── */
          <>
            <div style={{ marginBottom: 14 }}>
              <label
                htmlFor="login-identifier"
                style={{
                  display: 'block',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                {lang === 'tr' ? 'E-POSTA VEYA KULLANICI ADI' : 'EMAIL OR USERNAME ALIAS'}
              </label>

              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="login-identifier"
                  type="text"
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="operator@sovereign.enterprise / quantum_sentinel"
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                }}
              >
                <label htmlFor="login-password">{lang === 'tr' ? 'ANA ŞİFRE' : 'MASTER PASSPHRASE'}</label>
              </div>

              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  style={{
                    width: '100%',
                    padding: '8px 36px 8px 34px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Security Notice Footnote */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '8px 10px',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 16,
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          <ShieldCheck size={14} style={{ color: 'var(--clr-accent)', flexShrink: 0, marginTop: 1 }} />
          <span>
            {lang === 'tr'
              ? 'Sıfır-Bilgi Güvencesi: Kimlik bilgileriniz asla düz metin kaydedilmez. PBKDF2-SHA256 (310.000 iterasyon) ile yerel şifrelenir ve kör indeks (Blind Index) ile numaralandırma saldırılarına karşı korunur.'
              : 'Zero-Knowledge Guarantee: Credentials are never stored in plaintext. Derived locally via PBKDF2-SHA256 (310,000 iterations) and shielded with HMAC blind indexes against user enumeration.'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              {lang === 'tr' ? 'İPTAL' : 'CANCEL'}
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'var(--clr-accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#000',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(0, 229, 255, 0.25)',
              opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            <span>
              {isSubmitting
                ? lang === 'tr'
                  ? 'ŞİFRELENİYOR (PBKDF2)...'
                  : 'ENCRYPTING (PBKDF2)...'
                : mode === 'register'
                ? lang === 'tr'
                  ? 'ENKLAV KAYDINI TAMAMLA'
                  : 'REGISTER ENCLAVE'
                : lang === 'tr'
                ? 'GÜVENLİ GİRİŞ YAP'
                : 'AUTHENTICATE'}
            </span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Divider & Google OAuth Button */}
        {!isTotpChallengeStep && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 10px', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {lang === 'tr' ? 'VEYA' : 'OR'}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
            </div>

            <button
              type="button"
              id="btn-google-oauth"
              onClick={async () => {
                TactileSoundEngine.playClick();
                setIsSubmitting(true);
                setGeneralError(null);
                try {
                  const res = await GoogleOAuthService.signInWithGoogle();
                  if (res.success) {
                    TactileSoundEngine.playVaultLock();
                    onSuccess?.();
                  } else {
                    TactileSoundEngine.playSeismicWarning();
                    setGeneralError(res.error || (lang === 'tr' ? 'Google ile giriş başarısız.' : 'Google sign-in failed.'));
                  }
                } catch (err) {
                  TactileSoundEngine.playSeismicWarning();
                  setGeneralError(err instanceof Error ? err.message : 'Google authentication error.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isSubmitting}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '9px 14px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{lang === 'tr' ? 'Google ile Giriş Yap' : 'Continue with Google'}</span>
            </button>
          </>
        )}
      </form>
    </div>
  );
};
