import React from 'react';
import { Lock, Cpu } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../services/i18n/LanguageContext';

export const LandingFooter: React.FC<{
  onOpenHardwareDrawer: () => void;
}> = ({ onOpenHardwareDrawer }) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  return (
    <footer
      style={{
        padding: 'var(--sp-16) var(--sp-8) var(--sp-12)',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div className="container" style={{ maxWidth: 1140 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--sp-10)',
            marginBottom: 'var(--sp-12)',
          }}
        >
          {/* Col 1: System Identification */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  background: 'var(--clr-accent)',
                }}
              />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                SOVEREIGN-OS
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {t.footer.architectureBrief}
            </p>
          </div>

          {/* Col 2: Core Subsystems */}
          <div>
            <span className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-3)' }}>
              {language === 'tr' ? 'Alt Sistemler' : 'Subsystems'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: 'var(--text-xs)' }}>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { TactileSoundEngine.playClick(); navigate('/dashboard'); }}
                style={{ justifyContent: 'flex-start', padding: 0 }}
              >
                {language === 'tr' ? 'Hazine OS & Çoklu Kasa' : 'Treasury OS & Multi-Vault'}
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { TactileSoundEngine.playClick(); navigate('/blueprint'); }}
                style={{ justifyContent: 'flex-start', padding: 0 }}
              >
                {language === 'tr' ? 'Blueprint Graf Motoru' : 'Blueprint Graph Engine'}
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { TactileSoundEngine.playClick(); navigate('/auth'); }}
                style={{ justifyContent: 'flex-start', padding: 0 }}
              >
                {language === 'tr' ? 'Sıfır Güven Yetki Enklavı' : 'Zero-Trust Auth Enclave'}
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { TactileSoundEngine.playClick(); onOpenHardwareDrawer(); }}
                style={{ justifyContent: 'flex-start', padding: 0 }}
              >
                {t.footer.threatSpecsBtn}
              </button>
            </div>
          </div>

          {/* Col 3: Cryptographic Protocols */}
          <div>
            <span className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-3)' }}>
              {language === 'tr' ? 'Kriptografik Primitifler' : 'Cryptographic Primitives'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              <div>• AES-256-GCM BYOS Chunking</div>
              <div>• PBKDF2 @ 310,000 Iterations</div>
              <div>• SHA-256 Chained Hash Ledger</div>
              <div>• Ed25519 Duress Telemetry</div>
              <div>• Shannon Entropy Decomposition</div>
            </div>
          </div>

          {/* Col 4: Hardware Enclave */}
          <div>
            <span className="label-overline" style={{ display: 'block', marginBottom: 'var(--sp-3)' }}>
              {language === 'tr' ? 'Donanım İzolasyonu' : 'Hardware Isolation'}
            </span>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--sp-3)' }}>
              {language === 'tr'
                ? 'Tauri v2 ve SetWindowDisplayAffinity(0x11) ekran yakalama koruması ile yerel derleme.'
                : 'Tauri v2 ready with SetWindowDisplayAffinity(0x11) screen-capture protection.'}
            </p>
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => { TactileSoundEngine.playClick(); onOpenHardwareDrawer(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Cpu size={12} />
              {t.footer.threatSpecsBtn}
            </button>
          </div>
        </div>

        {/* Bottom Rule & Disclaimer */}
        <div
          style={{
            borderTop: '1px solid var(--border-hairline)',
            paddingTop: 'var(--sp-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--sp-4)',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={12} color="var(--clr-positive)" />
            <span>{t.footer.allSystemsOperational}</span>
          </div>
          <div>{t.footer.copyright}</div>
        </div>
      </div>
    </footer>
  );
};
