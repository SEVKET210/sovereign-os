import React, { useState, useEffect } from 'react';
import { Shield, KeyRound, Sparkles, Binary } from 'lucide-react';
import { ClientBlockCipher, type DecompositionResult } from '../../services/crypto/ClientBlockCipher';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { useLanguage } from '../../services/i18n/LanguageContext';

export const LiveCryptoInspector: React.FC = () => {
  const { t } = useLanguage();
  const [secretText, setSecretText] = useState('SOVEREIGN_KEY_ENCLAVE_NODE_ALPHA_2026');
  const [result, setResult] = useState<DecompositionResult | null>(null);

  useEffect(() => {
    ClientBlockCipher.decomposeIntoBlocks(secretText).then(setResult);
  }, [secretText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    TactileSoundEngine.playClick();
    setSecretText(e.target.value);
  };

  return (
    <section
      style={{
        padding: 'var(--sp-16) var(--sp-8)',
        borderTop: '1px solid var(--border-hairline)',
        borderBottom: '1px solid var(--border-hairline)',
        background: 'var(--bg-secondary)',
      }}
    >
      <div className="container" style={{ maxWidth: 1080 }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <Binary size={14} color="var(--clr-accent)" />
            <span className="label-overline">{t.inspector.overline}</span>
          </div>
          <h2 className="type-title" style={{ fontSize: 'var(--text-2xl)', letterSpacing: '-0.02em' }}>
            {t.inspector.title}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 680 }}>
            {t.inspector.subtitle}
          </p>
        </div>

        {/* Input Box */}
        <div
          style={{
            padding: 'var(--sp-4)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 'var(--sp-6)',
          }}
        >
          <label
            htmlFor="corporate-secret-input"
            style={{
              display: 'block',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--sp-2)',
              letterSpacing: '0.04em',
            }}
          >
            {t.inspector.inputLabel}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="corporate-secret-input"
              type="text"
              value={secretText}
              onChange={handleInputChange}
              placeholder={t.inspector.inputPlaceholder}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        {result && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--sp-3)',
              marginBottom: 'var(--sp-6)',
            }}
          >
            {/* Shannon Entropy */}
            <div
              style={{
                padding: 'var(--sp-4)',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="label-overline">{t.inspector.shannonEntropy}</span>
                <Sparkles size={13} color="var(--clr-accent)" />
              </div>
              <div className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--clr-accent)' }}>
                {result.shannonEntropyBits} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>bits / char</span>
              </div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--clr-positive)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {result.entropyClassification}
              </div>
            </div>

            {/* Block Alignment */}
            <div
              style={{
                padding: 'var(--sp-4)',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="label-overline">{t.inspector.blockCount}</span>
                <KeyRound size={13} color="var(--text-muted)" />
              </div>
              <div className="tabular-nums" style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {result.blockCount} <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>x 16-byte blocks</span>
              </div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                {t.inspector.totalBytes}: {result.byteLength} B
              </div>
            </div>

            {/* SHA-256 Digest Preview */}
            <div
              style={{
                padding: 'var(--sp-4)',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                gridColumn: 'span 2',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="label-overline">{t.inspector.sha256Digest}</span>
                <Shield size={13} color="var(--clr-positive)" />
              </div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  wordBreak: 'break-all',
                  letterSpacing: '0.02em',
                }}
              >
                {result.sha256Digest}
              </div>
              <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                COMPUTED VIA BROWSER CRYPTO.SUBTLE.DIGEST
              </div>
            </div>
          </div>
        )}

        {/* 16-Byte Cleaved Blocks Grid */}
        {result && (
          <div
            style={{
              padding: 'var(--sp-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
              <span className="label-overline">{t.inspector.cleavageVisualization}</span>
              <span className="label-mono" style={{ fontSize: '0.62rem' }}>PKCS#7</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {result.blocks.map((block) => (
                <div
                  key={block.index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 140px',
                    alignItems: 'center',
                    gap: 'var(--sp-4)',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-hairline)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.76rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>BLOCK #{block.index}</span>
                  <span style={{ color: 'var(--clr-accent)', letterSpacing: '0.05em' }}>
                    {block.hex}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', textAlign: 'right', letterSpacing: '0.08em' }}>
                    [{block.ascii}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
