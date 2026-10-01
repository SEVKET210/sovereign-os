import React, { useRef, useEffect, useState } from 'react';
import { useThemeStore, THEME_PRESETS, type Theme } from '../store/themeStore';
import { useLanguage, type Language } from '../services/i18n/LanguageContext';
import { useAudio } from '../audio/useAudio';
import { randomSalt, sha256 } from '../engine/crypto';
import { showToast } from '../components/Toast';
import { SurfaceCard } from '../components/GlassCard';
import { HashDisplay } from '../components/HashDisplay';
import { usePermissionStore } from '../stores/usePermissionStore';
import {
  Key,
  RefreshCw,
  Activity,
  Trash2,
  Lock,
  ShieldCheck,
  Check,
  SlidersHorizontal,
  Globe,
} from 'lucide-react';

/* ── Frequency Visualizer — functional, not decorative ───── */
const FrequencyVisualizer: React.FC<{
  analyser: AnalyserNode | null;
  enabled: boolean;
}> = ({ analyser, enabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser || !enabled) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const ctx = canvas.getContext('2d')!;
    const bufLen = analyser.frequencyBinCount;
    const data   = new Uint8Array(bufLen);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barW = Math.max(1, (width / bufLen) * 2 - 1);
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const barH = (data[i] / 255) * height;
        ctx.fillStyle = `rgba(78,242,210,${0.3 + (data[i] / 255) * 0.7})`;
        ctx.fillRect(x, height - barH, barW, barH);
        x += barW + 1;
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, enabled]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={48}
      style={{
        width: '100%',
        height: 48,
        display: 'block',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-hairline)',
        willChange: 'contents',
      }}
    />
  );
};

interface AuditEntry { time: string; action: string; hash: string; }

export const Settings: React.FC = () => {
  const { theme, setTheme, encryptedRecord, openDrawer, refreshAudit } = useThemeStore();
  const { language, setLanguage } = useLanguage();
  const { enabled, toggle, click, success, ambient, cryptoOp, analyser } = useAudio();
  const { currentRole, isFounder } = usePermissionStore();
  const canManageKeys = isFounder();

  const [sessionKey, setSessionKey] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  useEffect(() => {
    refreshAudit();
  }, [refreshAudit]);

  const logAction = async (action: string) => {
    const hash = await sha256(action + Date.now());
    setAuditLog((prev) => [{ time: new Date().toLocaleTimeString(), action, hash }, ...prev.slice(0, 19)]);
  };

  const handleLanguage = (lang: Language) => {
    click();
    setLanguage(lang);
    logAction(`Language changed → ${lang.toUpperCase()}`);
    showToast(
      lang === 'tr'
        ? 'Arayüz dili Türkçe (TR) olarak güncellendi.'
        : 'Interface language switched to English (EN).',
      'info'
    );
  };

  const handleTheme = (t: Theme) => {
    click();
    setTheme(t);
    const preset = THEME_PRESETS.find((p) => p.id === t);
    logAction(`Theme switched → ${preset?.name || t}`);
    showToast(`Workspace theme set to ${preset?.name || t} (Zero reload).`, 'info');
  };

  const handleAudioToggle = () => {
    click();
    toggle();
    logAction(`Audio ${enabled ? 'disabled' : 'enabled'}`);
  };

  const handleGenerateKey = async () => {
    if (!canManageKeys) {
      showToast('Yetki hatası: Kök kriptografik anahtar üretimi yalnızca Kurucu yetkisindedir.', 'error');
      return;
    }
    setGeneratingKey(true);
    cryptoOp();
    const salt = randomSalt(32);
    const key  = await sha256(salt + Date.now());
    setSessionKey(key);
    setGeneratingKey(false);
    success();
    logAction('Session key generated');
    showToast('Cryptographic key generated.', 'success');
  };

  const handleClearSession = () => {
    if (!canManageKeys) {
      showToast('Yetki hatası: Oturum sıfırlama yalnızca Kurucu yetkisindedir.', 'error');
      return;
    }
    click();
    sessionStorage.clear();
    setSessionKey('');
    logAction('Session cleared');
    showToast('Session data cleared.', 'warning');
  };

  return (
    <div style={{ padding: 'var(--sp-8)', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        paddingBottom: 'var(--sp-6)',
        borderBottom: '1px solid var(--border-hairline)',
        marginBottom: 'var(--sp-8)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        <div>
          <span className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
            System Architecture & Preferences
          </span>
          <h1 className="type-display" style={{ fontSize: 'var(--text-3xl)', letterSpacing: '-0.03em' }}>
            Settings & Theme Engine
          </h1>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { click(); openDrawer(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <SlidersHorizontal size={13} />
          Open Theme Drawer
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>

        {/* ── Language & Localization ───────────────── */}
        <SurfaceCard>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)',
            paddingBottom: 'var(--sp-4)',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Globe size={16} color="var(--clr-accent)" />
                <h2 className="type-title" style={{ fontSize: 'var(--text-md)' }}>
                  Dil ve Yerelleştirme / Language & Localization
                </h2>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Client-side kalıcı dil tercihi. Anında reaktif güncelleme (Sayfa yenilemesi gerektirmez / Zero reload).
              </span>
            </div>
            <span className="label-mono" style={{ color: 'var(--clr-accent)' }}>
              {language === 'tr' ? 'TÜRKÇE (TR)' : 'ENGLISH (EN)'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--sp-4)' }}>
            {/* Turkish Option */}
            <button
              onClick={() => handleLanguage('tr')}
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
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.25rem' }}>🇹🇷</span>
                  <div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Türkçe (TR)
                    </span>
                    <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)' }}>
                      Yerel & Kurumsal Arayüz
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
                Sovereign OS tüm finansal göstergeleri, kurucu panelleri ve kriptografik terminolojiyi Türkçe olarak sunar.
              </p>
            </button>

            {/* English Option */}
            <button
              onClick={() => handleLanguage('en')}
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
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.25rem' }}>🇬🇧</span>
                  <div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      English (EN)
                    </span>
                    <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)' }}>
                      Global Enclave Interface
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
                Operate Sovereign OS with high-precision international cryptography and sovereign banking terminology.
              </p>
            </button>
          </div>
        </SurfaceCard>

        {/* ── Theme Presets ──────────────────────────── */}
        <SurfaceCard>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)',
            paddingBottom: 'var(--sp-4)',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <div>
              <h2 className="type-title" style={{ fontSize: 'var(--text-md)' }}>Curated Theme Presets</h2>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Persistent, instant-switching theme provider stored in encrypted local storage (Zero page reload).
              </span>
            </div>
            <span className="label-mono">4 Presets</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--sp-4)' }}>
            {THEME_PRESETS.map((preset) => {
              const active = theme === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleTheme(preset.id)}
                  className="interactive"
                  style={{
                    padding: 'var(--sp-4)',
                    background: active ? 'var(--bg-surface)' : 'var(--bg-primary)',
                    border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--sp-3)',
                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}>
                        {preset.name}
                      </span>
                      {active && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--clr-accent-alpha)',
                          border: '1px solid var(--border-accent)',
                          fontSize: '0.62rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--clr-accent)',
                        }}>
                          <Check size={9} strokeWidth={2.5} />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Swatches */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div title="Substrate" style={{ width: 14, height: 14, borderRadius: 2, background: preset.bgHex, border: `1px solid ${preset.borderHex}` }} />
                      <div title="Card" style={{ width: 14, height: 14, borderRadius: 2, background: preset.cardHex, border: `1px solid ${preset.borderHex}` }} />
                      <div title="Accent" style={{ width: 14, height: 14, borderRadius: 2, background: preset.accentHex, border: '1px solid rgba(255,255,255,0.2)' }} />
                      <div title="Indicator" style={{ width: 8, height: 8, borderRadius: '50%', background: preset.indicatorHex, marginLeft: 2 }} />
                    </div>
                  </div>

                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {preset.subtitle}
                  </div>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
        </SurfaceCard>

        {/* ── Encrypted Storage Provider ─────────────── */}
        <SurfaceCard>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-4)',
            paddingBottom: 'var(--sp-4)',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <Lock size={16} color="var(--clr-positive)" />
              <h2 className="type-title" style={{ fontSize: 'var(--text-md)' }}>Encrypted Local Storage Engine</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color="var(--clr-positive)" />
              <span className="label-mono" style={{ color: 'var(--clr-positive)', fontSize: 'var(--text-2xs)' }}>
                AES-256-GCM ACTIVE
              </span>
            </div>
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
            Theme preferences are stored exclusively as AES-256-GCM ciphertexts with 96-bit random IVs.
            Keys are derived client-side via PBKDF2 with SHA-256 and client entropy. No plaintext theme values are written to disk.
          </p>

          <div style={{
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-hairline)',
            padding: 'var(--sp-3) var(--sp-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Storage Key:</span>
              <span className="label-mono">localStorage[sovereign_theme_enc]</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cipher Algorithm:</span>
              <span className="label-mono">AES-256-GCM / PBKDF2-SHA256 (100k iter)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Initialization Vector (IV):</span>
              <span className="label-mono">{encryptedRecord?.iv || '0x4a7b...'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Ciphertext Payload:</span>
              <span className="label-mono" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {encryptedRecord?.ciphertext || 'Loading ciphertext...'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
              <span style={{ color: 'var(--text-muted)' }}>DOM Synchronization:</span>
              <span className="label-mono" style={{ color: 'var(--clr-positive)' }}>0ms Zero-Reload Reactive Sync</span>
            </div>
          </div>
        </SurfaceCard>

        {/* ── Audio Engine ───────────────────────────── */}
        <SurfaceCard>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)', paddingBottom: 'var(--sp-4)',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <h2 className="type-title" style={{ fontSize: 'var(--text-md)' }}>Procedural Acoustic Engine</h2>
            <button
              className={`btn btn-sm ${enabled ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={handleAudioToggle}
              id="audio-toggle-btn"
            >
              {enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <span className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-2)' }}>
              Frequency Spectrum (Web Audio Analyser)
            </span>
            <FrequencyVisualizer analyser={analyser} enabled={enabled} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {[
              { label: 'Click',   fn: click },
              { label: 'Success', fn: success },
              { label: 'Ambient', fn: ambient },
              { label: 'Crypto',  fn: cryptoOp },
            ].map(({ label, fn }) => (
              <button
                key={label}
                className="btn btn-secondary btn-sm"
                onClick={() => fn()}
                disabled={!enabled}
              >
                {label}
              </button>
            ))}
          </div>
        </SurfaceCard>

        {/* ── Key Management ─────────────────────────── */}
        <SurfaceCard>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)',
            paddingBottom: 'var(--sp-4)',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <h2 className="type-title" style={{ fontSize: 'var(--text-md)' }}>
              Cryptographic Key Management
            </h2>
            {!canManageKeys && (
              <span style={{
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--clr-warning)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
              }}>
                🔒 YALNIZCA KURUCU YETKİSİ
              </span>
            )}
          </div>

          {sessionKey && (
            <div style={{ marginBottom: 'var(--sp-5)' }}>
              <HashDisplay hash={sessionKey} label="Session Key — SHA-256" truncate={false} />
            </div>
          )}

          {!canManageKeys && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
              Sovereign Kök Anahtar Üretimi ve Oturum Kripto Bellek temizleme yetkisi yalnızca Kurucu (Founder) operatörüne tahsis edilmiştir. Mevcut rolünüz: <strong style={{ color: 'var(--clr-accent)' }}>{currentRole.toUpperCase()}</strong>.
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button
              className="btn btn-primary"
              onClick={handleGenerateKey}
              disabled={generatingKey || !canManageKeys}
              id="generate-key-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-2)',
                opacity: canManageKeys ? 1 : 0.4,
                cursor: canManageKeys ? 'pointer' : 'not-allowed',
              }}
            >
              {generatingKey
                ? <RefreshCw size={13} className="anim-spin" />
                : <Key size={13} strokeWidth={1.75} />
              }
              Generate Key
            </button>
            <button
              className="btn btn-negative"
              onClick={handleClearSession}
              disabled={!canManageKeys}
              id="clear-session-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-2)',
                opacity: canManageKeys ? 1 : 0.4,
                cursor: canManageKeys ? 'pointer' : 'not-allowed',
              }}
            >
              <Trash2 size={13} strokeWidth={1.75} />
              Clear Session
            </button>
          </div>
        </SurfaceCard>

        {/* ── Audit Log ──────────────────────────────── */}
        <SurfaceCard padded={false}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--sp-5) var(--sp-6)',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <Activity size={15} color="var(--text-muted)" strokeWidth={1.75} />
              <h2 className="type-title" style={{ fontSize: 'var(--text-md)' }}>Audit Log</h2>
            </div>
            <span className="label-mono">{auditLog.length} events</span>
          </div>

          {auditLog.length === 0 ? (
            <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                No events recorded. Interact with settings to populate the log.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                    {['Time', 'Action', 'Hash'].map((h) => (
                      <th key={h} style={{
                        textAlign: 'left',
                        padding: 'var(--sp-2) var(--sp-4)',
                        fontSize: 'var(--text-2xs)',
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-secondary)',
                        position: 'sticky', top: 0,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((e, i) => (
                    <tr
                      key={i}
                      className="anim-ticker-in"
                      style={{ borderBottom: '1px solid var(--border-hairline)' }}
                    >
                      <td style={{ padding: 'var(--sp-2) var(--sp-4)', whiteSpace: 'nowrap' }}>
                        <span className="label-mono" style={{ fontSize: 'var(--text-2xs)' }}>{e.time}</span>
                      </td>
                      <td style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {e.action}
                      </td>
                      <td style={{ padding: 'var(--sp-2) var(--sp-4)', minWidth: 180 }}>
                        <HashDisplay hash={e.hash} truncate />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>

      </div>
    </div>
  );
};
