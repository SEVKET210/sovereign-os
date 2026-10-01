import React from 'react';
import { X, Cpu } from 'lucide-react';
import { useLanguage } from '../../services/i18n/LanguageContext';

export const HardwareArchitectureDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  if (!isOpen) return null;

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

      {/* Surface */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Cpu size={16} color="var(--clr-accent)" />
            <h2 className="type-title" style={{ fontSize: 'var(--text-sm)' }}>
              {t.hardwareDrawer.title}
            </h2>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 4 }}>
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div>
            <span className="label-overline">{t.hardwareDrawer.overline}</span>
            <h3 className="type-title" style={{ fontSize: 'var(--text-md)', marginTop: 4, marginBottom: 8 }}>
              {language === 'tr' ? 'Yerel Enklav ve Çapraz Derleme Şartnamesi' : 'Native Enclave & Cross-Compilation Specs'}
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {language === 'tr'
                ? 'SOVEREIGN-OS, düşük seviyeli çekirdek API\'lerini birleşik bir donanım köprüsü (PlatformBridge.ts) aracılığıyla soyutlar ve Tauri v2 aracılığıyla yerel Windows, macOS ve Android ikili dosyalarına sıfır değişiklikle derleme sağlar.'
                : 'SOVEREIGN-OS abstracts low-level kernel APIs through a unified hardware bridge (PlatformBridge.ts), enabling zero-modification cross-compilation into native Windows, macOS, and Android binaries via Tauri v2.'}
            </p>
          </div>

          {/* Core Defense Pillars */}
          {[
            {
              title: t.hardwareDrawer.spec1Title,
              desc: t.hardwareDrawer.spec1Desc,
              badge: 'RAM ENCLAVE',
            },
            {
              title: t.hardwareDrawer.spec2Title,
              desc: t.hardwareDrawer.spec2Desc,
              badge: 'SURFACE BLUR',
            },
            {
              title: t.hardwareDrawer.spec3Title,
              desc: t.hardwareDrawer.spec3Desc,
              badge: 'CONSTANT-TIME',
            },
            {
              title: t.hardwareDrawer.spec4Title,
              desc: t.hardwareDrawer.spec4Desc,
              badge: 'DURESS DECOY',
            },
          ].map((pillar, i) => (
            <div
              key={i}
              style={{
                padding: 'var(--sp-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {pillar.title}
                </span>
                <span className="label-mono" style={{ fontSize: '0.60rem', color: 'var(--clr-accent)' }}>
                  {pillar.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                {pillar.desc}
              </p>
            </div>
          ))}
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
          <span>FIPS 140-3 ATTESTATION READY</span>
          <button className="btn btn-primary btn-xs" onClick={onClose}>
            {t.hardwareDrawer.closeBtn}
          </button>
        </div>
      </aside>
    </div>
  );
};
