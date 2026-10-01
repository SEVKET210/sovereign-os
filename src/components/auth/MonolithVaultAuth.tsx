import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  KeyRound,
  AlertTriangle,
  ArrowRight,
  Database,
  Building,
  Grid,
  Check,
  UserCog,
  Mail,
  AlertCircle,
  CheckCircle2,
  Building2,
  Cpu,
  Layers,
  Globe,
  Terminal,
} from 'lucide-react';
import { PreBootAttestationBadge } from './PreBootAttestationBadge';
import { CredentialRegistrationForm } from './CredentialRegistrationForm';
import { RollingPasswordService } from '../../services/crypto/RollingPasswordService';
import { KeyDerivationBridge } from '../../services/crypto/KeyDerivationBridge';
import { Bip39Service } from '../../services/crypto/Bip39Service';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import { useTeamStore } from '../../stores/useTeamStore';
import { useCompanyStore } from '../../stores/useCompanyStore';
import { ROLE_DEFINITIONS } from '../../types/permissions';
import type { PreBootAttestationReport } from '../../types';
import type { InviteToken } from '../../types/team';

export const MonolithVaultAuth: React.FC = () => {
  const navigate = useNavigate();
  const { chooseSoloMode, createCompany, acceptInvite } = useCompanyStore();
  const { invites } = useTeamStore();

  // If already set up, redirect past auth to dashboard
  // (app mode is already handled by App.tsx showing wizard if SETUP)

  const [keyInput, setKeyInput] = useState('');
  const [, setAttestationReport] = useState<PreBootAttestationReport | null>(null);
  const [authModality, setAuthModality] = useState<'CREDENTIALS' | 'ROLLING_TOTP'>('CREDENTIALS');
  const [workspaceMode, setWorkspaceMode] = useState<'PERSONAL_SANDBOX' | 'ENTERPRISE_NODE' | 'JOIN_ENTERPRISE'>('PERSONAL_SANDBOX');

  // Solo / Sandbox fields
  const [soloAlias, setSoloAlias] = useState('');

  // Enterprise / Company fields
  const [companyName, setCompanyName] = useState('');
  const [founderAlias, setFounderAlias] = useState('');
  const [selectedIconId, setSelectedIconId] = useState('building');

  // Join Invite fields
  const [candidateAlias, setCandidateAlias] = useState('');
  const [inviteTokenInput, setInviteTokenInput] = useState('');
  const [previewedInvite, setPreviewedInvite] = useState<InviteToken | null>(null);
  const [joinSubmitted, setJoinSubmitted] = useState<boolean>(false);

  // UI state
  const [isScramblerOpen, setIsScramblerOpen] = useState(false);
  const [clipboardWarning, setClipboardWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  const ENTERPRISE_ICON_OPTIONS = [
    { id: 'building', label: 'Kurumsal', icon: Building2 },
    { id: 'shield', label: 'Savunma', icon: Shield },
    { id: 'cpu', label: 'Kuantum', icon: Cpu },
    { id: 'layers', label: 'Protokol', icon: Layers },
    { id: 'globe', label: 'Ağ', icon: Globe },
    { id: 'terminal', label: 'Enclave', icon: Terminal },
  ];

  // When invite token input changes, try to preview the role
  useEffect(() => {
    const token = inviteTokenInput.trim().toUpperCase();
    if (token.length > 8) {
      const found = invites.find((inv) => inv.token === token && inv.status === 'ACTIVE');
      setPreviewedInvite(found || null);
    } else {
      setPreviewedInvite(null);
    }
  }, [inviteTokenInput, invites]);

  // ── Clipboard / Context Menu guards ──────────────────────────
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    TactileSoundEngine.playClick();
    setClipboardWarning(true);
    showToast('CLIPBOARD INTERCEPT: External paste blocked to prevent memory theft.', 'warning');
    setTimeout(() => setClipboardWarning(false), 4000);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    TactileSoundEngine.playClick();
    setClipboardWarning(true);
    showToast('CONTEXT MENU RESTRICTED: Precision titanium enclave protected.', 'warning');
    setTimeout(() => setClipboardWarning(false), 4000);
  };

  // ── Scrambler keypad ──────────────────────────────────────────
  const [scramblerKeys, setScramblerKeys] = useState<string[]>([]);

  useEffect(() => {
    const chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    setScramblerKeys(chars);
  }, [isScramblerOpen]);

  const handleScramblerPress = (char: string) => {
    TactileSoundEngine.playClick();
    if (keyInput.length >= 14) return;
    let next = keyInput + char;
    const raw = next.replace(/-/g, '');
    if (raw.length === 4 || raw.length === 8) {
      next = raw.slice(0, 4) + '-' + raw.slice(4, 8) + (raw.length > 8 ? '-' + raw.slice(8) : '');
    }
    setKeyInput(next);
  };

  const handleScramblerBackspace = () => {
    TactileSoundEngine.playClick();
    setKeyInput((prev) => prev.slice(0, -1));
  };

  // ── DYNAMIC ENCLAVE authenticate ──────────────────────────────
  const handleAuthenticate = async () => {
    // 1. Enforce mandatory Operator Alias
    if (workspaceMode === 'PERSONAL_SANDBOX') {
      const alias = soloAlias.trim().toUpperCase();
      if (!alias) {
        setErrorMessage('Lütfen operatör takma adınızı (Alias) giriniz. İsimsiz giriş yapılamaz.');
        TactileSoundEngine.playSeismicWarning();
        showToast('Operatör takma adı zorunludur.', 'warning');
        return;
      }
    } else if (workspaceMode === 'ENTERPRISE_NODE') {
      const alias = founderAlias.trim().toUpperCase();
      if (!alias) {
        setErrorMessage('Lütfen kurucu operatör takma adınızı giriniz. İsimsiz giriş yapılamaz.');
        TactileSoundEngine.playSeismicWarning();
        showToast('Kurucu operatör adı zorunludur.', 'warning');
        return;
      }
      if (!companyName.trim()) {
        setErrorMessage('Lütfen şirket adınızı giriniz.');
        TactileSoundEngine.playSeismicWarning();
        showToast('Şirket adı zorunludur.', 'warning');
        return;
      }
    }

    const sanitized = keyInput.trim();
    if (!sanitized) {
      setErrorMessage('Lütfen operatör kök parolanızı veya 30s dinamik jetonunuzu giriniz.');
      return;
    }

    setAuthenticating(true);
    setErrorMessage('');

    const targetAlias =
      workspaceMode === 'ENTERPRISE_NODE'
        ? founderAlias.trim().toUpperCase()
        : soloAlias.trim().toUpperCase();

    // 2. Check if operator is enrolled in Dynamic Enclave
    const enrolledOperator = RollingPasswordService.getEnrolledDynamicOperator(targetAlias);

    if (enrolledOperator) {
      const verifyResult = await RollingPasswordService.verifyDynamicOperator(targetAlias, sanitized);
      if (verifyResult.isDecoy || verifyResult.isDuress) {
        sessionStorage.setItem('sovereign-session', `decoy_node_${Date.now()}`);
        TactileSoundEngine.playVaultLock();
        showToast('Enklav Kilidi Açıldı.', 'success');
        navigate('/dashboard');
        return;
      }

      if (!verifyResult.success) {
        setAuthenticating(false);
        setErrorMessage(verifyResult.errorTr || 'Geçersiz anahtar veya dinamik jeton.');
        TactileSoundEngine.playSeismicWarning();
        showToast('Enclave doğrulaması başarısız.', 'error');
        return;
      }
    } else {
      // Operator not yet enrolled: Genesis setup
      if (sanitized.length < 12) {
        setAuthenticating(false);
        setErrorMessage('İLK KURULUM: Kök Enclave Parolası en az 12 karakter olmalıdır.');
        TactileSoundEngine.playSeismicWarning();
        showToast('Zayıf anahtar reddedildi.', 'error');
        return;
      }

      // Auto-enroll new operator
      await RollingPasswordService.enrollDynamicOperator({
        alias: targetAlias,
        masterPassphrase: sanitized,
        workspaceMode: workspaceMode === 'JOIN_ENTERPRISE' ? 'PERSONAL_SANDBOX' : workspaceMode,
        companyName: workspaceMode === 'ENTERPRISE_NODE' ? companyName.trim() : undefined,
      });
      showToast(`Yeni Enclave Kimliği Mühürlendi: ${targetAlias}`, 'success');
    }

    try {
      const activeOp = enrolledOperator || RollingPasswordService.getEnrolledDynamicOperator(targetAlias);

      // Support BIP-39 recovery mnemonic or deterministic dynamic TOTP enclave key
      if (sanitized.split(/\s+/).length >= 12 && Bip39Service.validateMnemonic(sanitized)) {
        await KeyDerivationBridge.initializeContext('sovereign_primary_enclave_01', sanitized, false);
      } else {
        const enclavePassphrase = sanitized.length >= 12
          ? sanitized
          : `ENCLAVE_TOTP_KEY_${activeOp?.totpSecretHex.slice(0, 32) || 'AUTONOMOUS_ENCLAVE_ROOT'}`;
        await KeyDerivationBridge.initializeContext('sovereign_primary_enclave_01', enclavePassphrase, true);
      }

      TactileSoundEngine.playVaultLock();

      // Set session profile based on mode
      if (workspaceMode === 'PERSONAL_SANDBOX') {
        chooseSoloMode(soloAlias.trim().toUpperCase());
      }
      if (workspaceMode === 'ENTERPRISE_NODE') {
        if (companyName.trim()) {
          createCompany(companyName.trim(), selectedIconId, founderAlias.trim().toUpperCase());
        } else {
          chooseSoloMode(founderAlias.trim().toUpperCase());
        }
      }

      sessionStorage.setItem('sovereign-session', `sovereign_enclave_${Date.now()}`);
      showToast('Enklav Doğrulandı. Yetki Seviyesi: L4 Kurucu.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setAuthenticating(false);
      const msg = err instanceof Error ? err.message : 'Kriptografik başlatma hatası.';
      setErrorMessage(msg);
      showToast('Kasa başlatılamadı.', 'error');
    }
  };

  // ── JOIN INVITE submit ────────────────────────────────────────
  const handleJoinSubmit = async () => {
    if (!inviteTokenInput.trim()) {
      setErrorMessage('Geçerli bir davetiye kodu giriniz.');
      return;
    }
    if (!candidateAlias.trim()) {
      setErrorMessage('Lütfen operator takma adınızı giriniz.');
      return;
    }

    setAuthenticating(true);
    setErrorMessage('');

    // First try direct session resolution from invite
    const result = acceptInvite(inviteTokenInput.trim().toUpperCase(), candidateAlias.trim(), invites);

    if (result.success) {
      // Also submit join request for team roster
      await useTeamStore.getState().submitJoinRequest(inviteTokenInput.trim(), candidateAlias.trim());
      setAuthenticating(false);
      setJoinSubmitted(true);
      TactileSoundEngine.playVaultLock();
      sessionStorage.setItem('sovereign-session', `sovereign_enclave_${Date.now()}`);
      showToast('Davetiye doğrulandı — enklava erişim verildi.', 'success');
      // Navigate directly since role is already set
      setTimeout(() => navigate('/dashboard'), 1200);
      return;
    }

    // Fallback: submit join request and wait for approval
    const fallback = await useTeamStore.getState().submitJoinRequest(inviteTokenInput.trim(), candidateAlias.trim());
    setAuthenticating(false);

    if (!fallback.success) {
      setErrorMessage(result.error || fallback.error || 'Geçersiz veya süresi dolmuş davetiye kodu.');
      showToast('Davetiye reddedildi.', 'error');
      return;
    }

    setJoinSubmitted(true);
    showToast('Katılım talebi Kurucu Enklav\'ına iletildi.', 'success');
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 52px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-6)',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Monolithic Titanium Safe Card */}
      <div
        className="anim-scale-in"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <div
              style={{
                width: 10, height: 10, borderRadius: 2,
                background: 'var(--clr-accent)',
                border: '1px solid var(--border-hairline)',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em' }}>
              TİTANYUM KASA // SIFIR-GÜVEN ENCLAVE KAPISI
            </span>
          </div>
          <Lock size={14} color="var(--text-muted)" />
        </div>

        {/* Inner Content */}
        <div style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <PreBootAttestationBadge onAttestationComplete={setAttestationReport} />

          {/* Clipboard Warning */}
          {clipboardWarning && (
            <div
              className="anim-ticker-in"
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--clr-caution-alpha)',
                border: '1px solid var(--clr-caution)',
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 'var(--text-xs)', color: 'var(--text-primary)',
              }}
            >
              <AlertTriangle size={14} color="var(--clr-caution)" style={{ flexShrink: 0 }} />
              <span>Native paste intercepted to protect cryptographic clipboard memory.</span>
            </div>
          )}

          {/* ── AUTHENTICATION MODALITY SWITCHER ── */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-primary)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-moderate)',
            }}
          >
            <button
              type="button"
              id="btn-auth-modality-credentials"
              onClick={() => {
                TactileSoundEngine.playClick();
                setAuthModality('CREDENTIALS');
                setErrorMessage('');
              }}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '0.67rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                background: authModality === 'CREDENTIALS' ? 'var(--clr-accent)' : 'transparent',
                color: authModality === 'CREDENTIALS' ? '#000' : 'var(--text-secondary)',
              }}
            >
              <Mail size={13} />
              E-POSTA & ŞİFRE (ZK)
            </button>
            <button
              type="button"
              id="btn-auth-modality-totp"
              onClick={() => {
                TactileSoundEngine.playClick();
                setAuthModality('ROLLING_TOTP');
                setErrorMessage('');
              }}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '0.67rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                background: authModality === 'ROLLING_TOTP' ? 'var(--clr-accent)' : 'transparent',
                color: authModality === 'ROLLING_TOTP' ? '#000' : 'var(--text-secondary)',
              }}
            >
              <Shield size={13} />
              DİNAMİK TOTP / PASSPHRASE
            </button>
          </div>

          {authModality === 'CREDENTIALS' ? (
            <CredentialRegistrationForm
              onSuccess={() => {
                navigate('/dashboard');
              }}
            />
          ) : (
            <>
              {/* ── TARGET WORKSPACE RESOLUTION ──────────────────── */}
          <div>
            <span className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              Çalışma Alanı & Enklav Türü
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-2)' }}>
              <button
                type="button"
                className={`btn btn-xs ${workspaceMode === 'PERSONAL_SANDBOX' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { TactileSoundEngine.playClick(); setWorkspaceMode('PERSONAL_SANDBOX'); setErrorMessage(''); setJoinSubmitted(false); }}
                style={{ justifyContent: 'center', gap: 5, fontSize: '0.66rem' }}
              >
                <Database size={11} />
                Bireysel (Solo)
              </button>
              <button
                type="button"
                className={`btn btn-xs ${workspaceMode === 'ENTERPRISE_NODE' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { TactileSoundEngine.playClick(); setWorkspaceMode('ENTERPRISE_NODE'); setErrorMessage(''); setJoinSubmitted(false); }}
                style={{ justifyContent: 'center', gap: 5, fontSize: '0.66rem' }}
              >
                <Building size={11} />
                Kurumsal
              </button>
              <button
                type="button"
                className={`btn btn-xs ${workspaceMode === 'JOIN_ENTERPRISE' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { TactileSoundEngine.playClick(); setWorkspaceMode('JOIN_ENTERPRISE'); setErrorMessage(''); }}
                style={{ justifyContent: 'center', gap: 5, fontSize: '0.66rem' }}
              >
                <KeyRound size={11} />
                Davetiye ile Katıl
              </button>
            </div>
          </div>

          {/* ═══ MODE A: SANDBOX (SOLO) ═══════════════════════════ */}
          {workspaceMode === 'PERSONAL_SANDBOX' && (
            <>
              {/* Solo Alias */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label className="label-overline" style={{ display: 'block' }}>
                    Operatör Takma Adı (Zorunlu)
                  </label>
                  {!soloAlias.trim() && (
                    <span style={{ fontSize: '0.62rem', color: '#eab308', fontFamily: 'var(--font-mono)' }}>
                      * isim zorunludur
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={soloAlias}
                  onChange={(e) => {
                    setSoloAlias(e.target.value.toUpperCase());
                    setErrorMessage('');
                  }}
                  placeholder="ÖRN. OPERATOR_ALICE"
                  maxLength={24}
                  style={{
                    width: '100%', padding: '9px 14px',
                    background: 'var(--bg-primary)',
                    border: `1px solid ${!soloAlias.trim() && errorMessage ? 'var(--clr-negative)' : 'var(--border-moderate)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  Sisteme ve güvenli enklava erişmek için benzersiz bir operatör adı girmelisiniz.
                </div>
              </div>

              {/* Enclave Enrollment Status Badge */}
              {(() => {
                const rawAlias = soloAlias.trim().toUpperCase();
                if (!rawAlias) {
                  return (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(234, 179, 8, 0.05)',
                        border: '1px dashed rgba(234, 179, 8, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={13} color="#eab308" />
                        <span style={{ color: '#eab308' }}>Operatör Adı Giriniz (Zorunlu)</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#eab308', opacity: 0.85 }}>
                        İSİM BEKLENİYOR
                      </span>
                    </div>
                  );
                }

                const enrolled = RollingPasswordService.getEnrolledDynamicOperator(rawAlias);
                return (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: enrolled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.08)',
                      border: `1px solid ${enrolled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {enrolled ? (
                        <>
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>Mühürlü Enclave: <strong style={{ color: 'var(--clr-accent)' }}>{rawAlias}</strong></span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={13} color="#eab308" />
                          <span>Yeni Operatör: <strong style={{ color: '#eab308' }}>{rawAlias}</strong> (Kök Tohum Bekleniyor)</span>
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: '0.62rem', color: enrolled ? '#10b981' : '#eab308', opacity: 0.85 }}>
                      {enrolled ? 'BIP-39 & TOTP AKTİF' : 'KAYIT BEKLENİYOR'}
                    </span>
                  </div>
                );
              })()}

              {/* Passphrase */}
              <PassphraseSection
                keyInput={keyInput}
                setKeyInput={setKeyInput}
                isScramblerOpen={isScramblerOpen}
                setIsScramblerOpen={setIsScramblerOpen}
                scramblerKeys={scramblerKeys}
                handlePaste={handlePaste}
                handleScramblerPress={handleScramblerPress}
                handleScramblerBackspace={handleScramblerBackspace}
                errorMessage={errorMessage}
                isEnrolled={Boolean(soloAlias.trim() && RollingPasswordService.getEnrolledDynamicOperator(soloAlias.trim().toUpperCase()))}
                onGenerateToken={async () => {
                  const targetAlias = soloAlias.trim().toUpperCase();
                  if (!targetAlias) {
                    TactileSoundEngine.playSeismicWarning();
                    setErrorMessage('Lütfen önce operatör takma adınızı (Alias) giriniz.');
                    showToast('Önce Operatör Adı girmelisiniz.', 'warning');
                    return;
                  }
                  TactileSoundEngine.playVaultLock();
                  const enrolled = Boolean(RollingPasswordService.getEnrolledDynamicOperator(targetAlias));
                  if (enrolled) {
                    const tok = RollingPasswordService.getCurrentRollingTokenForOperator(targetAlias);
                    if (tok) {
                      setKeyInput(tok.dynamicKeyFormatted);
                      showToast(`30s Dinamik Jeton Kopyalandı: ${tok.dynamicKeyFormatted}`, 'info');
                    }
                  } else {
                    const res = await RollingPasswordService.enrollDynamicOperator({
                      alias: targetAlias,
                      workspaceMode: 'PERSONAL_SANDBOX',
                    });
                    setKeyInput(res.seedPassphrase);
                    showToast(`12 Kelimelik BIP-39 Kök Tohum Üretildi: ${targetAlias}`, 'success');
                  }
                }}
              />

              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleAuthenticate}
                disabled={authenticating || !soloAlias.trim() || !keyInput.trim()}
                id="vault-authenticate-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  opacity: (!soloAlias.trim() || !keyInput.trim()) ? 0.5 : 1,
                  cursor: (!soloAlias.trim() || !keyInput.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                <Shield size={15} />
                {authenticating ? 'Kriptografik Kimlik Doğrulanıyor...' : 'Enklav Kilidini Aç'}
                <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* ═══ MODE B: ENTERPRISE (COMPANY FOUNDER) ════════════ */}
          {workspaceMode === 'ENTERPRISE_NODE' && (
            <>
              {/* Company Setup Section */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'rgba(99,102,241,0.9)', fontWeight: 600, letterSpacing: '0.1em' }}>
                  ŞİRKET KURULUMU / ENTERPRISE CONFIG
                </div>

                {/* Company Name */}
                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 5 }}>
                    Şirket Adı
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="örn. Acme Teknoloji A.Ş."
                    maxLength={48}
                    style={{
                      width: '100%', padding: '9px 14px',
                      background: 'var(--bg-primary)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Enterprise Icon Selector */}
                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 5 }}>
                    Enklav Logosu
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ENTERPRISE_ICON_OPTIONS.map(({ id, icon: IconComp }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedIconId(id)}
                        style={{
                          width: 34, height: 34, borderRadius: 6,
                          background: selectedIconId === id ? 'rgba(99,102,241,0.15)' : 'var(--bg-primary)',
                          border: `2px solid ${selectedIconId === id ? 'rgba(99,102,241,0.6)' : 'var(--border-hairline)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: selectedIconId === id ? 'var(--clr-accent)' : 'var(--text-muted)',
                        }}
                      >
                        <IconComp size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Founder Alias */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label className="label-overline" style={{ display: 'block' }}>
                      Kurucu Operatör Takma Adı (Zorunlu)
                    </label>
                    {!founderAlias.trim() && (
                      <span style={{ fontSize: '0.62rem', color: '#eab308', fontFamily: 'var(--font-mono)' }}>
                        * isim zorunludur
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={founderAlias}
                    onChange={(e) => {
                      setFounderAlias(e.target.value.toUpperCase());
                      setErrorMessage('');
                    }}
                    placeholder="ÖRN. KURUCU_LIDER"
                    maxLength={24}
                    style={{
                      width: '100%', padding: '9px 14px',
                      background: 'var(--bg-primary)',
                      border: `1px solid ${!founderAlias.trim() && errorMessage ? 'var(--clr-negative)' : 'rgba(99, 102, 241, 0.3)'}`,
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Operator Enclave Enrollment Status (Founder) */}
              {(() => {
                const rawAlias = founderAlias.trim().toUpperCase();
                if (!rawAlias) {
                  return (
                    <div
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(234, 179, 8, 0.05)',
                        border: '1px dashed rgba(234, 179, 8, 0.4)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={13} color="#eab308" />
                        <span style={{ color: '#eab308' }}>Kurucu Adı Giriniz (Zorunlu)</span>
                      </div>
                      <span style={{ fontSize: '0.62rem', color: '#eab308', opacity: 0.85 }}>
                        İSİM BEKLENİYOR
                      </span>
                    </div>
                  );
                }

                const enrolled = Boolean(RollingPasswordService.getEnrolledDynamicOperator(rawAlias));
                return (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: enrolled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(234, 179, 8, 0.08)',
                      border: `1px solid ${enrolled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {enrolled ? (
                        <>
                          <CheckCircle2 size={13} color="#10b981" />
                          <span>Kurumsal Enclave: <strong style={{ color: 'var(--clr-accent)' }}>{rawAlias}</strong></span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={13} color="#eab308" />
                          <span>Yeni Kurucu Operatör: <strong style={{ color: '#eab308' }}>{rawAlias}</strong> (Kök Tohum Bekleniyor)</span>
                        </>
                      )}
                    </div>
                    <span style={{ fontSize: '0.62rem', color: enrolled ? '#10b981' : '#eab308', opacity: 0.85 }}>
                      {enrolled ? 'BIP-39 & TOTP AKTİF' : 'KAYIT BEKLENİYOR'}
                    </span>
                  </div>
                );
              })()}

              {/* Passphrase */}
              <PassphraseSection
                keyInput={keyInput}
                setKeyInput={setKeyInput}
                isScramblerOpen={isScramblerOpen}
                setIsScramblerOpen={setIsScramblerOpen}
                scramblerKeys={scramblerKeys}
                handlePaste={handlePaste}
                handleScramblerPress={handleScramblerPress}
                handleScramblerBackspace={handleScramblerBackspace}
                errorMessage={errorMessage}
                isEnrolled={Boolean(founderAlias.trim() && RollingPasswordService.getEnrolledDynamicOperator(founderAlias.trim().toUpperCase()))}
                onGenerateToken={async () => {
                  const targetAlias = founderAlias.trim().toUpperCase();
                  if (!targetAlias) {
                    TactileSoundEngine.playSeismicWarning();
                    setErrorMessage('Lütfen önce kurucu operatör adınızı giriniz.');
                    showToast('Önce Kurucu Adı girmelisiniz.', 'warning');
                    return;
                  }
                  TactileSoundEngine.playVaultLock();
                  const enrolled = Boolean(RollingPasswordService.getEnrolledDynamicOperator(targetAlias));
                  if (enrolled) {
                    const tok = RollingPasswordService.getCurrentRollingTokenForOperator(targetAlias);
                    if (tok) {
                      setKeyInput(tok.dynamicKeyFormatted);
                      showToast(`30s Dinamik Jeton Kopyalandı: ${tok.dynamicKeyFormatted}`, 'info');
                    }
                  } else {
                    const res = await RollingPasswordService.enrollDynamicOperator({
                      alias: targetAlias,
                      workspaceMode: 'ENTERPRISE_NODE',
                      companyName: companyName.trim() || undefined,
                    });
                    setKeyInput(res.seedPassphrase);
                    showToast(`12 Kelimelik BIP-39 Kök Tohum Üretildi: ${targetAlias}`, 'success');
                  }
                }}
              />

              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleAuthenticate}
                disabled={authenticating || !companyName.trim() || !founderAlias.trim() || !keyInput.trim()}
                id="vault-authenticate-btn"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
                  opacity: (!companyName.trim() || !founderAlias.trim() || !keyInput.trim()) ? 0.5 : 1,
                  cursor: (!companyName.trim() || !founderAlias.trim() || !keyInput.trim()) ? 'not-allowed' : 'pointer',
                }}
              >
                <Building size={15} />
                {authenticating ? 'Şirket Enklav Başlatılıyor...' : `${companyName.trim() || 'Şirket'} Kur & Giriş`}
                <ArrowRight size={15} />
              </button>
            </>
          )}

          {/* ═══ MODE C: JOIN INVITE ══════════════════════════════ */}
          {workspaceMode === 'JOIN_ENTERPRISE' && (
            !joinSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Alias */}
                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 6 }}>
                    Operatör Takma Adınız
                  </label>
                  <input
                    type="text"
                    value={candidateAlias}
                    onChange={(e) => setCandidateAlias(e.target.value.toUpperCase())}
                    placeholder="OPERATOR_ALIAS"
                    maxLength={24}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Invite Token */}
                <div>
                  <label className="label-overline" style={{ display: 'block', marginBottom: 6 }}>
                    Davetiye Kodu
                  </label>
                  <input
                    type="text"
                    value={inviteTokenInput}
                    onChange={(e) => { setInviteTokenInput(e.target.value.toUpperCase()); setErrorMessage(''); }}
                    placeholder="SOV-INV-XXXX-YYYY-ZZZZ"
                    maxLength={26}
                    style={{
                      width: '100%', padding: '10px 14px',
                      background: 'var(--bg-primary)',
                      border: `1px solid ${errorMessage ? 'var(--clr-negative)' : 'var(--border-moderate)'}`,
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                      letterSpacing: '0.06em', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errorMessage && (
                    <div style={{ color: 'var(--clr-negative)', fontSize: '0.72rem', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                      {errorMessage}
                    </div>
                  )}
                </div>

                {/* Role Preview — shown when token is recognized */}
                {previewedInvite && (() => {
                  const roleDef = ROLE_DEFINITIONS[previewedInvite.preAssignedRole];
                  return (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(78, 242, 210, 0.06)',
                        border: '1px solid rgba(78, 242, 210, 0.3)',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}
                    >
                      <Check size={14} color="var(--clr-accent)" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--clr-accent)', fontWeight: 700 }}>
                          DAVETİYE DOĞRULANDI
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserCog size={12} color="var(--text-muted)" />
                          <span>Atanan Rol:</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {roleDef.badgeEmoji} {roleDef.labelTr}
                          </span>
                          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            · {previewedInvite.preAssignedClearance.replace('_', '-')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div
                  style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(78, 242, 210, 0.05)',
                    border: '1px solid rgba(78, 242, 210, 0.2)',
                    fontSize: '0.66rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--clr-accent)',
                  }}
                >
                  HARDWARE FINGERPRINT & EPHEMERAL KEYS WILL BE ATTESTED ON SUBMISSION
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleJoinSubmit}
                  disabled={authenticating}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
                >
                  <Shield size={15} />
                  {authenticating ? 'Cihaz Parmak İzi Bağlanıyor...' : 'Davetiyeyi Kullan & Sisteme Gir'}
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              /* Join request submitted — waiting for approval */
              <div
                style={{
                  display: 'flex', flexDirection: 'column', gap: 12,
                  padding: 16,
                  background: 'rgba(78, 242, 210, 0.08)',
                  border: '1px solid rgba(78, 242, 210, 0.35)',
                  borderRadius: 6, textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', color: 'var(--clr-accent)', fontWeight: 700 }}>
                  [TALEP KURUCU ENKLAVINA İLETİLDİ]
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Cihaz parmak izi ve operatör takma adı <strong>{candidateAlias}</strong> kaydedildi.
                </div>
                <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  DURUM: KURUCU ONAYI BEKLENİYOR
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Lütfen kurucunuzu <strong>Ekip Yönetimi</strong> sayfasından talebinizi onaylaması için uyarın.
                </div>
                <button
                  onClick={() => { setJoinSubmitted(false); setWorkspaceMode('PERSONAL_SANDBOX'); }}
                  className="btn btn-secondary btn-xs"
                  style={{ marginTop: 6 }}
                >
                  Sandbox Girişine Dön
                </button>
              </div>
            )
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Passphrase Input Section (shared between Sandbox & Enterprise) ── */
interface PassphraseSectionProps {
  keyInput: string;
  setKeyInput: (v: string) => void;
  isScramblerOpen: boolean;
  setIsScramblerOpen: (v: boolean) => void;
  scramblerKeys: string[];
  handlePaste: (e: React.ClipboardEvent) => void;
  handleScramblerPress: (char: string) => void;
  handleScramblerBackspace: () => void;
  errorMessage: string;
  isEnrolled?: boolean;
  onGenerateToken?: () => void;
}

const PassphraseSection: React.FC<PassphraseSectionProps> = ({
  keyInput, setKeyInput,
  isScramblerOpen, setIsScramblerOpen,
  scramblerKeys,
  handlePaste, handleScramblerPress, handleScramblerBackspace,
  errorMessage,
  isEnrolled,
  onGenerateToken,
}) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
      <label htmlFor="dynamic-key-input" className="label-overline">
        Kök Parola / BIP-39 Tohum veya 30s TOTP Kodu
      </label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setIsScramblerOpen(!isScramblerOpen)}
          style={{ background: 'transparent', border: 'none', color: 'var(--clr-accent)', fontSize: 'var(--text-2xs)', fontFamily: 'var(--font-mono)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Grid size={10} />
          {isScramblerOpen ? 'Klavyeyi Gizle' : 'Scrambler Klavye'}
        </button>

        {onGenerateToken && (
          <button
            type="button"
            id="btn-generate-dynamic-token"
            onClick={onGenerateToken}
            title={isEnrolled ? "30s Dinamik Jeton Üret ve Doldur" : "12 Kelimelik BIP-39 Kök Tohum Üret"}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--clr-accent)',
              fontSize: 'var(--text-2xs)',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <KeyRound size={10} />
            <span>Jeton Oluştur</span>
          </button>
        )}
      </div>
    </div>

    <input
      id="dynamic-key-input"
      type="text"
      value={keyInput}
      onPaste={handlePaste}
      onChange={(e) => setKeyInput(e.target.value)}
      placeholder="12 kelimelik tohum (BIP-39) veya 30s kod (örn: 849-210)"
      maxLength={256}
      style={{
        width: '100%', padding: '12px 16px',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-moderate)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
        letterSpacing: '0.04em', textAlign: 'center', outline: 'none',
      }}
    />

    {errorMessage && (
      <div style={{ color: 'var(--clr-negative)', fontSize: 'var(--text-xs)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
        {errorMessage}
      </div>
    )}

    {isScramblerOpen && (
      <div className="anim-ticker-in" style={{ marginTop: 10, padding: 'var(--sp-3)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>RASTGELE SCRAMBLER MATRİSİ</span>
          <span>KEYLOGGER ENGELLEME AKTİF</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
          {scramblerKeys.map((k) => (
            <button key={k} type="button" onClick={() => handleScramblerPress(k)} className="btn btn-secondary btn-xs" style={{ padding: '6px 0', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {k}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <button type="button" onClick={handleScramblerBackspace} className="btn btn-ghost btn-xs" style={{ fontSize: '0.65rem' }}>
            Sil ⌫
          </button>
        </div>
      </div>
    )}

    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', border: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
      <span>ENCLAVE KÖK OTORİTESİ: HARDWARE-BOUND</span>
      <span style={{ color: 'var(--clr-accent)' }}>KRİPTOGRAFİK MOTOR: ÇEVRİMİÇİ</span>
    </div>
  </div>
);
