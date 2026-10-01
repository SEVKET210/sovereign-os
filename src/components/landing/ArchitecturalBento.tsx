import React, { useState } from 'react';
import {
  GitBranch,
  TrendingUp,
  HardDrive,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../services/i18n/LanguageContext';

export const ArchitecturalBento: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedBento, setSelectedBento] = useState<number>(0);

  return (
    <section
      style={{
        padding: 'var(--sp-20) var(--sp-8)',
        background: 'var(--bg-primary)',
      }}
    >
      <div className="container" style={{ maxWidth: 1140 }}>
        {/* Section Header */}
        <div style={{ marginBottom: 'var(--sp-12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <span className="label-overline">{t.bento.overline}</span>
          </div>
          <h2 className="type-title" style={{ fontSize: 'var(--text-3xl)', letterSpacing: '-0.03em' }}>
            {t.bento.title}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 640 }}>
            {t.bento.subtitle}
          </p>
        </div>

        {/* 2x2 Bento Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
            gap: 'var(--sp-6)',
          }}
        >
          {/* Bento Card 1: Blueprint DAG Visualizer */}
          <div
            onClick={() => { TactileSoundEngine.playNodeConnectSnap(); setSelectedBento(0); }}
            className="interactive"
            style={{
              padding: 'var(--sp-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${selectedBento === 0 ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 340,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <GitBranch size={16} color="var(--clr-accent)" />
                  </div>
                  <div>
                    <h3 className="type-title" style={{ fontSize: 'var(--text-md)' }}>{t.bento.card1Title}</h3>
                    <span className="label-mono" style={{ fontSize: '0.62rem' }}>{t.bento.card1Subtitle}</span>
                  </div>
                </div>
                <span className="label-mono" style={{ color: 'var(--clr-positive)' }}>{t.bento.card1Badge}</span>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>
                {t.bento.card1Desc}
              </p>

              {/* Interactive Mini-Canvas Simulation */}
              <div
                style={{
                  height: 140,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-hairline)',
                  padding: 'var(--sp-3)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                }}
              >
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  [TASK NODE] SLA 02:44
                </div>
                <div
                  style={{
                    width: 60,
                    height: 1,
                    background: 'var(--clr-accent)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--clr-indicator)',
                      position: 'absolute',
                      top: -2.5,
                      left: '50%',
                    }}
                  />
                </div>
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  [BUDGET: $250,000]
                </div>
              </div>
            </div>

            <button
              className="btn btn-ghost btn-xs"
              onClick={() => navigate('/blueprint')}
              style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {t.bento.card1Btn}
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Bento Card 2: Treasury & Cashflow Engine */}
          <div
            onClick={() => { TactileSoundEngine.playLedgerSealThud(); setSelectedBento(1); }}
            className="interactive"
            style={{
              padding: 'var(--sp-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${selectedBento === 1 ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 340,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <TrendingUp size={16} color="var(--clr-accent)" />
                  </div>
                  <div>
                    <h3 className="type-title" style={{ fontSize: 'var(--text-md)' }}>{t.bento.card2Title}</h3>
                    <span className="label-mono" style={{ fontSize: '0.62rem' }}>{t.bento.card2Subtitle}</span>
                  </div>
                </div>
                <span className="label-mono" style={{ color: 'var(--clr-accent)' }}>{t.bento.card2Badge}</span>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>
                {t.bento.card2Desc}
              </p>

              {/* Real-time Runway Bar Preview */}
              <div
                style={{
                  padding: 'var(--sp-3)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>RUNWAY SURVIVAL RADAR:</span>
                  <span style={{ color: 'var(--clr-positive)', fontWeight: 600 }}>24.8 MONTHS (SOVEREIGN)</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '82%', height: '100%', background: 'var(--clr-positive)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>RESERVES: $6.76M USD</span>
                  <span>ROLLING 90D BURN: $8,450/DAY</span>
                </div>
              </div>
            </div>

            <button
              className="btn btn-ghost btn-xs"
              onClick={() => navigate('/dashboard')}
              style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-4)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {t.bento.card2Btn}
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Bento Card 3: Zero-Knowledge Storage (BYOS) */}
          <div
            onClick={() => { TactileSoundEngine.playClick(); setSelectedBento(2); }}
            className="interactive"
            style={{
              padding: 'var(--sp-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${selectedBento === 2 ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 340,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <HardDrive size={16} color="var(--clr-accent)" />
                  </div>
                  <div>
                    <h3 className="type-title" style={{ fontSize: 'var(--text-md)' }}>{t.bento.card3Title}</h3>
                    <span className="label-mono" style={{ fontSize: '0.62rem' }}>{t.bento.card3Subtitle}</span>
                  </div>
                </div>
                <span className="label-mono" style={{ color: 'var(--clr-positive)' }}>{t.bento.card3Badge}</span>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>
                {t.bento.card3Desc}
              </p>

              {/* Diagram */}
              <div
                style={{
                  padding: 'var(--sp-3)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Raw File</div>
                  <span style={{ color: 'var(--text-muted)' }}>Memory Only</span>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>4 MB Chunks</div>
                  <span style={{ color: 'var(--clr-positive)' }}>AES-256-GCM</span>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Cloud R2 / S3</div>
                  <span style={{ color: 'var(--text-muted)' }}>Blind Payload</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-4)' }}>
              <Lock size={12} color="var(--clr-positive)" />
              Zero plaintext bytes ever touch intermediary cloud storage.
            </div>
          </div>

          {/* Bento Card 4: Client-Side BYO-AI */}
          <div
            onClick={() => { TactileSoundEngine.playClick(); setSelectedBento(3); }}
            className="interactive"
            style={{
              padding: 'var(--sp-6)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${selectedBento === 3 ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 340,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <Cpu size={16} color="var(--clr-accent)" />
                  </div>
                  <div>
                    <h3 className="type-title" style={{ fontSize: 'var(--text-md)' }}>{t.bento.card4Title}</h3>
                    <span className="label-mono" style={{ fontSize: '0.62rem' }}>{t.bento.card4Subtitle}</span>
                  </div>
                </div>
                <span className="label-mono" style={{ color: 'var(--clr-positive)' }}>{t.bento.card4Badge}</span>
              </div>

              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>
                {t.bento.card4Desc}
              </p>

              {/* Flow Visualization */}
              <div
                style={{
                  padding: 'var(--sp-3)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle2 size={13} color="var(--clr-positive)" />
                  <span>Browser Enclave ──[Direct TLS 1.3]──&gt; AI Provider</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--clr-negative)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.64rem' }}>[BLOCKED]</span>
                  <span>No sovereign-os server telemetry or prompt interception</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', marginTop: 'var(--sp-4)' }}>
              <ShieldCheck size={12} color="var(--clr-positive)" />
              Compatible with local Ollama instances on localhost:11434.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
