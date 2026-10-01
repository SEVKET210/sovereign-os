import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Volume2,
  VolumeX,
  Check,
  ExternalLink,
} from 'lucide-react';
import { useThemeStore, THEME_PRESETS, type Theme } from '../store/themeStore';
import { useAudio } from '../audio/useAudio';
import { showToast } from './Toast';
import { useNavigate } from 'react-router-dom';

export const SettingsDrawer: React.FC = () => {
  const { theme, setTheme, isDrawerOpen, closeDrawer, encryptedRecord, refreshAudit } = useThemeStore();
  const { enabled: audioEnabled, toggle: toggleAudio, click, success } = useAudio();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'themes' | 'crypto' | 'typography'>('themes');
  const [copySuccess, setCopySuccess] = useState(false);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      refreshAudit();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen, refreshAudit]);

  const handleSelectTheme = (t: Theme) => {
    click();
    setTheme(t);
    showToast(`Theme switched to ${THEME_PRESETS.find((p) => p.id === t)?.name || t} with zero reload.`, 'info');
  };

  const handleCopyCiphertext = () => {
    if (!encryptedRecord) return;
    click();
    navigator.clipboard.writeText(JSON.stringify(encryptedRecord, null, 2));
    setCopySuccess(true);
    showToast('Encrypted ciphertext copied to clipboard.', 'success');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (!isDrawerOpen) return null;

  const activePreset = THEME_PRESETS.find((p) => p.id === theme) || THEME_PRESETS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings and Theme Engine Drawer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-drawer)' as unknown as number,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* ── Backdrop Scrim ─────────────────────────────────── */}
      <div
        onClick={() => { click(); closeDrawer(); }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: 'enter-fade var(--dur-fast) var(--ease-out) both',
        }}
      />

      {/* ── Off-Canvas Slide Drawer ────────────────────────── */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-moderate)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'enter-up var(--dur-base) var(--ease-out) both',
          willChange: 'transform',
        }}
      >
        {/* ── Drawer Header ─────────────────────────────────── */}
        <div
          style={{
            padding: 'var(--sp-5) var(--sp-6)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-moderate)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-tertiary)',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: activePreset.accentHex,
                  border: `1px solid ${activePreset.indicatorHex}`,
                }}
              />
            </div>
            <div>
              <div className="label-overline" style={{ fontSize: '0.62rem' }}>Engine Preferences</div>
              <h2 className="type-title" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                Settings & Theme Engine
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => { click(); closeDrawer(); }}
              aria-label="Close settings drawer"
              style={{ padding: '6px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs ───────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-secondary)',
            padding: '0 var(--sp-6)',
          }}
        >
          {[
            { id: 'themes', label: 'Theme Presets (4)' },
            { id: 'crypto', label: 'Encrypted Vault' },
            { id: 'typography', label: 'Typography' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { click(); setActiveTab(tab.id as any); }}
                style={{
                  padding: 'var(--sp-3) var(--sp-4)',
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
                  transition: 'color var(--dur-fast) var(--ease-out)',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Drawer Scrollable Content ──────────────────────── */}
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
          {/* TAB 1: THEME PRESETS */}
          {activeTab === 'themes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label-overline">Curated Theme Matrix</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--clr-indicator)',
                    letterSpacing: '0.04em',
                  }}
                >
                  ZERO RELOAD / INSTANT CSS SYNC
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {THEME_PRESETS.map((preset) => {
                  const isSelected = theme === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectTheme(preset.id)}
                      className="interactive"
                      style={{
                        padding: 'var(--sp-4)',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                        border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--sp-3)',
                        boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                            <span
                              style={{
                                fontSize: 'var(--text-sm)',
                                fontWeight: 600,
                                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {preset.name}
                            </span>
                            {isSelected && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--clr-accent-alpha)',
                                  border: '1px solid var(--border-accent)',
                                  fontSize: '0.62rem',
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--clr-accent)',
                                  fontWeight: 600,
                                }}
                              >
                                <Check size={10} strokeWidth={2.5} />
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 'var(--text-2xs)',
                              color: 'var(--text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {preset.subtitle}
                          </span>
                        </div>

                        {/* Swatch Matrix Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div
                            title={`Background: ${preset.bgHex}`}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 2,
                              background: preset.bgHex,
                              border: `1px solid ${preset.borderHex}`,
                            }}
                          />
                          <div
                            title={`Card: ${preset.cardHex}`}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 2,
                              background: preset.cardHex,
                              border: `1px solid ${preset.borderHex}`,
                            }}
                          />
                          <div
                            title={`Accent: ${preset.accentHex}`}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 2,
                              background: preset.accentHex,
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          />
                          <div
                            title={`Indicator: ${preset.indicatorHex}`}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: preset.indicatorHex,
                              marginLeft: 2,
                            }}
                          />
                        </div>
                      </div>

                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {preset.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Quick Audio & Settings Link */}
              <div
                style={{
                  marginTop: 'var(--sp-2)',
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500 }}>Acoustic Synthesizer</div>
                    <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                      {audioEnabled ? 'Active procedural Web Audio' : 'Audio engine muted'}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => { click(); toggleAudio(); }}
                >
                  {audioEnabled ? 'Mute' : 'Enable'}
                </button>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  click();
                  closeDrawer();
                  navigate('/settings');
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Open Full System Settings
                <ExternalLink size={12} />
              </button>
            </div>
          )}

          {/* TAB 2: ENCRYPTED VAULT INSPECTOR */}
          {activeTab === 'crypto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="label-overline">Encrypted Local Storage Engine</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--clr-positive)',
                  }}
                >
                  <Lock size={10} />
                  AES-256-GCM
                </span>
              </div>

              <div
                style={{
                  padding: 'var(--sp-4)',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <ShieldCheck size={16} color="var(--clr-positive)" />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Client-Side Cryptographic Guarantee
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  The theme preference is stored exclusively in encrypted binary form. Zero plaintext values exist in localStorage.
                  The 256-bit AES key is derived locally via PBKDF2 with SHA-256 from client-side entropy.
                </p>
              </div>

              {/* Encryption Metadata Table */}
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--bg-primary)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Storage Telemetry</span>
                  <span className="label-mono" style={{ fontSize: '0.62rem' }}>localStorage[sovereign_theme_enc]</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { label: 'Algorithm', val: encryptedRecord?.algorithm || 'AES-256-GCM' },
                    { label: 'Key Derivation', val: encryptedRecord?.keyDerivation || 'PBKDF2-SHA256 (100,000 iter)' },
                    { label: 'IV (96-bit base64)', val: encryptedRecord?.iv || 'Initialising...' },
                    { label: 'Active Cipher Preset', val: activePreset.name },
                    { label: 'Last Encrypted', val: encryptedRecord?.timestamp ? new Date(encryptedRecord.timestamp).toLocaleTimeString() : 'Just now' },
                  ].map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: 'var(--sp-2) var(--sp-4)',
                        borderBottom: '1px solid var(--border-hairline)',
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Ciphertext Box */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                  <span className="label-overline">Raw Ciphertext (AES-GCM Payload)</span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={handleCopyCiphertext}
                    style={{ fontSize: '0.65rem' }}
                  >
                    {copySuccess ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre
                  style={{
                    padding: 'var(--sp-3)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.70rem',
                    color: 'var(--clr-indicator)',
                    overflowX: 'auto',
                    maxHeight: 140,
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {encryptedRecord ? JSON.stringify(encryptedRecord, null, 2) : 'Loading encrypted store...'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: TYPOGRAPHY MATRIX */}
          {activeTab === 'typography' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
              <div>
                <span className="label-overline">3-Tier Typography Matrix</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Optical sizing, negative tracking, monospaced tabular alignment, and editorial serif contrast.
                </p>
              </div>

              {/* Tier 1: Primary UI & Headings */}
              <div
                style={{
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                  <span className="label-overline">Tier 1: Primary UI & Headings</span>
                  <span className="label-mono">Geist Sans / Inter Tight</span>
                </div>
                <div className="type-display" style={{ fontSize: 'var(--text-xl)', marginBottom: 6 }}>
                  Sovereign Autonomous Architecture
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Optical sizing enabled, tight letter spacing tracking-[-0.03em], crisp high-contrast legibility.
                </p>
              </div>

              {/* Tier 2: Crypto & Numeric */}
              <div
                style={{
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                  <span className="label-overline">Tier 2: Cryptographic & Numerical Data</span>
                  <span className="label-mono">JetBrains Mono / Geist Mono</span>
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: 'var(--text-md)',
                    color: 'var(--clr-accent)',
                    marginBottom: 6,
                  }}
                >
                  847,293.00 USD • 12.847 MH/s • 0x8f4c...3e1a
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Strict monospaced tabular numbers for immutable financial ledgers and hash chains.
                </p>
              </div>

              {/* Tier 3: Editorial Accents */}
              <div
                style={{
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                  <span className="label-overline">Tier 3: Editorial Accents (Landing Display)</span>
                  <span className="label-mono">Instrument Serif / Playfair Display</span>
                </div>
                <div className="type-editorial" style={{ fontSize: 'var(--text-2xl)', marginBottom: 6 }}>
                  "Precision Horology Meets Sovereign Cryptography"
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Italicized, high-end editorial display contrast against industrial monospaced labels.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Drawer Footer ─────────────────────────────────── */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            SOVEREIGN-OS / v3.0-THEME-ENGINE
          </span>

          <button
            className="btn btn-primary btn-xs"
            onClick={() => {
              success();
              closeDrawer();
            }}
          >
            Apply & Close
          </button>
        </div>
      </aside>
    </div>
  );
};
