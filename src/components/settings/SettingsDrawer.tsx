import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  HardDrive,
  Volume2,
  Lock,
  Check,
  Copy,
  ShieldAlert,
  Globe,
} from 'lucide-react';
import { ThemeSelector } from './ThemeSelector';
import { ByosConfigPanel } from './ByosConfigPanel';
import { useTheme } from '../../services/theme/ThemeContext';
import { useLanguage } from '../../services/i18n/LanguageContext';
import { useIncidentStore } from '../../stores/useIncidentStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { RollingPasswordService } from '../../services/crypto/RollingPasswordService';
import { showToast } from '../Toast';

export const SettingsDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'themes' | 'language' | 'byos' | 'audio' | 'crypto' | 'escalation'>('themes');
  const { language, setLanguage } = useLanguage();
  const [volume, setVolume] = useState<number>(0.6);
  const [copied, setCopied] = useState(false);
  const [duressInput, setDuressInput] = useState('');
  const [isDuressConfigured, setIsDuressConfigured] = useState(RollingPasswordService.isDuressConfigured());
  const [enrollingDuress, setEnrollingDuress] = useState(false);
  const { encryptedRecord } = useTheme();

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    TactileSoundEngine.setVolume(val);
  };

  const handleCopyCiphertext = () => {
    if (!encryptedRecord) return;
    TactileSoundEngine.playClick();
    navigator.clipboard.writeText(JSON.stringify(encryptedRecord, null, 2));
    setCopied(true);
    showToast('Encrypted ciphertext copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnrollDuress = async () => {
    if (duressInput.trim().length < 8) {
      showToast('Duress PIN must be at least 8 characters.', 'error');
      return;
    }
    setEnrollingDuress(true);
    try {
      await RollingPasswordService.enrollDuressPin(duressInput.trim());
      setIsDuressConfigured(true);
      setDuressInput('');
      TactileSoundEngine.playLedgerSealThud();
      showToast('Dynamic Duress PIN enrolled and salted successfully.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enroll duress PIN.';
      showToast(msg, 'error');
    } finally {
      setEnrollingDuress(false);
    }
  };

  const handleClearDuress = () => {
    RollingPasswordService.clearDuressPin();
    setIsDuressConfigured(false);
    TactileSoundEngine.playClick();
    showToast('Dynamic Duress PIN removed.', 'warning');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-drawer)' as unknown as number,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.70)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Drawer Surface */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-moderate)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'enter-up var(--dur-base) var(--ease-out) both',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span className="label-overline" style={{ fontSize: '0.62rem' }}>System Preferences Hub</span>
            <h2 className="type-title" style={{ fontSize: 'var(--text-sm)' }}>
              Settings & Customization Engine
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            {/* Quick Language Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                background: 'var(--bg-secondary)',
                padding: '2px 4px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setLanguage('tr');
                  showToast('Arayüz dili Türkçe (TR) olarak ayarlandı.', 'info');
                }}
                style={{
                  padding: '2px 7px',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: language === 'tr' ? 700 : 400,
                  borderRadius: 2,
                  border: 'none',
                  background: language === 'tr' ? 'var(--clr-accent)' : 'transparent',
                  color: language === 'tr' ? '#060B18' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                TR
              </button>
              <button
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setLanguage('en');
                  showToast('Interface language set to English (EN).', 'info');
                }}
                style={{
                  padding: '2px 7px',
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: language === 'en' ? 700 : 400,
                  borderRadius: 2,
                  border: 'none',
                  background: language === 'en' ? 'var(--clr-accent)' : 'transparent',
                  color: language === 'en' ? '#060B18' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                EN
              </button>
            </div>

            <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 4 }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-secondary)',
            padding: '0 var(--sp-6)',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'themes', label: 'Curated Themes', icon: Palette },
            { id: 'language', label: 'Dil / Language', icon: Globe },
            { id: 'byos', label: 'BYOS / BYO-AI', icon: HardDrive },
            { id: 'audio', label: 'Tactile Audio', icon: Volume2 },
            { id: 'crypto', label: 'Encrypted Vault', icon: Lock },
            { id: 'escalation', label: 'Emergency Sentinel', icon: ShieldAlert },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { TactileSoundEngine.playClick(); setActiveTab(tab.id as any); }}
                style={{
                  padding: 'var(--sp-3) var(--sp-3)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${active ? 'var(--clr-accent)' : 'transparent'}`,
                  background: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--sp-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-6)',
          }}
        >
          {/* TAB 1: THEMES */}
          {activeTab === 'themes' && (
            <div>
              <div style={{ marginBottom: 'var(--sp-4)' }}>
                <span className="label-overline">Four Curated Presets</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Stored in client-side AES-256-GCM encrypted local storage. Zero page reload.
                </p>
              </div>
              <ThemeSelector />
            </div>
          )}

          {/* TAB: LANGUAGE */}
          {activeTab === 'language' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <div>
                <span className="label-overline">Dil ve Yerelleştirme / Language & Localization</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Client-side kalıcı dil tercihi. Anında reaktif güncelleme (Sayfa yenilemesi gerekmez / Zero page reload).
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {/* Turkish Option */}
                <button
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setLanguage('tr');
                    showToast('Arayüz dili Türkçe (TR) olarak ayarlandı.', 'info');
                  }}
                  className="interactive"
                  style={{
                    padding: 'var(--sp-4)',
                    background: language === 'tr' ? 'var(--bg-surface)' : 'var(--bg-primary)',
                    border: `1px solid ${language === 'tr' ? 'var(--clr-accent)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--sp-2)',
                    boxShadow: language === 'tr' ? '0 0 16px rgba(78, 242, 210, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.4rem' }}>🇹🇷</span>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Türkçe (TR)
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Varsayılan Yerel Arayüz
                        </span>
                      </div>
                    </div>
                    {language === 'tr' && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          background: 'rgba(78, 242, 210, 0.15)',
                          color: 'var(--clr-accent)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={10} /> AKTİF
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Sovereign OS tüm finansal göstergeleri, kurucu panelleri ve metrikleri Türkçe olarak sunar.
                  </p>
                </button>

                {/* English Option */}
                <button
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setLanguage('en');
                    showToast('Interface language set to English (EN).', 'info');
                  }}
                  className="interactive"
                  style={{
                    padding: 'var(--sp-4)',
                    background: language === 'en' ? 'var(--bg-surface)' : 'var(--bg-primary)',
                    border: `1px solid ${language === 'en' ? 'var(--clr-accent)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--sp-2)',
                    boxShadow: language === 'en' ? '0 0 16px rgba(78, 242, 210, 0.12)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.4rem' }}>🇬🇧</span>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          English (EN)
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          International Sovereign Interface
                        </span>
                      </div>
                    </div>
                    {language === 'en' && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--font-mono)',
                          background: 'rgba(78, 242, 210, 0.15)',
                          color: 'var(--clr-accent)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={10} /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Operate Sovereign OS with high-precision international typography and cryptographic terminology.
                  </p>
                </button>
              </div>

              <div
                style={{
                  padding: 'var(--sp-3)',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Globe size={14} color="var(--clr-accent)" />
                <span>Tercih tarayıcı yerel hafızasında saklanır (Key: <code>sovereign_lang_pref</code>).</span>
              </div>
            </div>
          )}

          {/* TAB 2: BYOS & BYO-AI */}
          {activeTab === 'byos' && <ByosConfigPanel />}

          {/* TAB 3: TACTILE AUDIO */}
          {activeTab === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <div>
                <span className="label-overline">Tactile Mechanical Acoustic Engine</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Synthesized Web Audio API soundboard (zero external .mp3/.wav files).
                </p>
              </div>

              <div
                style={{
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-4)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--text-xs)' }}>
                    <span>Synthesizer Master Output</span>
                    <span className="tabular-nums">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={handleVolumeChange}
                    style={{ width: '100%', accentColor: 'var(--clr-accent)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => TactileSoundEngine.playVaultLock()}
                  >
                    Test Vault Lock
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => TactileSoundEngine.playNodeConnectSnap()}
                  >
                    Test Metallic Transient
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => TactileSoundEngine.playRollingKeyRefresh()}
                  >
                    Test Shimmer Wave
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => TactileSoundEngine.playLedgerSealThud()}
                  >
                    Test Sub-Bass Thud
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ENCRYPTED VAULT INSPECTION */}
          {activeTab === 'crypto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <div>
                <span className="label-overline">Cryptographic Storage Telemetry</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Inspection of localized AES-256-GCM encrypted persistence vectors.
                </p>
              </div>

              <div
                style={{
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Algorithm:</span>
                  <span style={{ color: 'var(--clr-positive)' }}>{encryptedRecord?.algorithm || 'AES-256-GCM'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Derivation:</span>
                  <span>{encryptedRecord?.keyDerivation || 'PBKDF2-SHA256 (100k)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>IV (Base64):</span>
                  <span>{encryptedRecord?.iv || 'Initialising...'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                  <span>{encryptedRecord?.timestamp ? new Date(encryptedRecord.timestamp).toLocaleTimeString() : 'Just now'}</span>
                </div>
              </div>

              {/* Raw Ciphertext */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="label-overline">Raw Ciphertext (AES Payload)</span>
                  <button className="btn btn-ghost btn-xs" onClick={handleCopyCiphertext} style={{ fontSize: '0.64rem' }}>
                    {copied ? <Check size={11} color="var(--clr-positive)" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre
                  style={{
                    padding: 'var(--sp-3)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-hairline)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: 'var(--clr-indicator)',
                    maxHeight: 140,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {encryptedRecord ? JSON.stringify(encryptedRecord, null, 2) : 'Loading cipher store...'}
                </pre>
              </div>

              {/* Dynamic Duress Trigger Configuration */}
              <div
                style={{
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span className="label-overline" style={{ display: 'block' }}>
                      Silent Duress Trigger (Anti-Coercion)
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      Secondary passphrase that unlocks a synthetic decoy workspace.
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.66rem',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: isDuressConfigured ? 'rgba(78, 242, 210, 0.1)' : 'rgba(255, 75, 75, 0.1)',
                      color: isDuressConfigured ? 'var(--clr-accent)' : 'var(--clr-negative)',
                      border: `1px solid ${isDuressConfigured ? 'var(--clr-accent)' : 'var(--clr-negative)'}`,
                    }}
                  >
                    {isDuressConfigured ? 'ARMED' : 'STANDBY'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    value={duressInput}
                    onChange={(e) => setDuressInput(e.target.value)}
                    placeholder="Enter Duress PIN (min. 8 chars)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={handleEnrollDuress}
                    disabled={enrollingDuress || duressInput.trim().length < 8}
                    style={{ padding: '0 12px', fontSize: '0.68rem' }}
                  >
                    {enrollingDuress ? 'Salting...' : isDuressConfigured ? 'Update PIN' : 'Arm PIN'}
                  </button>
                  {isDuressConfigured && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={handleClearDuress}
                      style={{ padding: '0 8px', fontSize: '0.68rem', color: 'var(--clr-negative)' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EMERGENCY SENTINEL & ESCALATION */}
          {activeTab === 'escalation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <div>
                <span className="label-overline">Zero-Knowledge Emergency Sentinel</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Autonomous operational invariant monitors & multi-channel signed egress dispatch.
                </p>
              </div>

              {/* Status Banner */}
              <div
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
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
                      borderRadius: 4,
                      background: 'rgba(78, 242, 210, 0.12)',
                      border: '1px solid rgba(78, 242, 210, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldAlert size={16} color="var(--clr-accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Sentinel Invariant Engine
                    </div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      HMAC-SHA256 Signed Egress // Off-Band Founder Relay
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.60rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: 'var(--clr-positive)',
                  }}
                >
                  ARMED
                </span>
              </div>

              {/* Quick Actions */}
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  onClose();
                  useIncidentStore.getState().openCockpit('incidents');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: '0.72rem',
                }}
              >
                <ShieldAlert size={14} />
                <span>Launch Emergency Governance Cockpit</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.66rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <span>SOVEREIGN ENCLAVE PREFERENCES</span>
          <button className="btn btn-primary btn-xs" onClick={onClose}>
            Apply & Close
          </button>
        </div>
      </aside>
    </div>
  );
};
