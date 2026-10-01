import React, { useState } from 'react';
import { Cpu, ShieldCheck, Sparkles, Sliders, Cloud } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { useAiStore } from '../../stores/useAiStore';
import { useVaultStore } from '../../services/storage/useVaultStore';
import type { ByoAiRegistryConfig, StorageEndpoint } from '../../types';

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export const ByosConfigPanel: React.FC = () => {
  const { openConfigModal, activeProvider, configs } = useAiStore();
  const {
    cloudConfig,
    cloudTelemetry,
    setStorageEndpoint,
    openCockpitModal,
    storageEndpoint,
  } = useVaultStore();

  const [byoAi, setByoAi] = useState<ByoAiRegistryConfig>({
    provider: 'GEMINI',
    apiKeyMasked: 'AIzaSy*******************************',
    localDirectFetchOnly: true,
    modelIdentifier: 'gemini-2.5-pro',
    enabled: true,
  });

  const handleOpenCockpit = () => {
    TactileSoundEngine.playClick();
    openCockpitModal();
  };

  const handleSaveAi = () => {
    openConfigModal();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* ── BYOS Multi-Cloud Storage Module ────────────────────── */}
      <div
        style={{
          padding: 'var(--sp-5)',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Cloud size={16} color="var(--clr-accent)" />
            <h3 className="type-title" style={{ fontSize: 'var(--text-sm)' }}>
              Bring Your Own Storage (BYOS) Multi-Cloud
            </h3>
          </div>
          <span className="label-mono" style={{ color: 'var(--clr-positive)', fontSize: '0.62rem' }}>
            SIGV4 &amp; DIRECT EGRESS
          </span>
        </div>

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          All corporate documents and ledger snapshots are cleaved into 4 MB chunks on the client,
          encrypted with localized AES-256-GCM keys, and dispatched directly to your cloud bucket
          via browser-native AWS SigV4, Google Drive API, or WebDAV.
        </p>

        {/* Provider Radio Selector */}
        <div>
          <span className="label-overline" style={{ display: 'block', marginBottom: 6 }}>
            Storage Provider Target
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)' }}>
            {(
              [
                { id: 'VDS_LOCAL', label: 'Local VDS' },
                { id: 'AWS_S3', label: 'AWS S3' },
                { id: 'CLOUDFLARE_R2', label: 'Cloudflare R2' },
                { id: 'MINIO', label: 'MinIO' },
                { id: 'GOOGLE_DRIVE', label: 'Google Drive' },
                { id: 'WEBDAV', label: 'WebDAV' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                className={`btn btn-xs ${storageEndpoint === p.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStorageEndpoint(p.id as StorageEndpoint)}
                style={{ fontSize: '0.64rem', padding: '6px 4px' }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Cloud Telemetry Readout */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Status: </span>
            <strong
              style={{
                color:
                  cloudConfig.status === 'CONNECTED'
                    ? 'var(--clr-positive)'
                    : cloudConfig.status === 'ERROR'
                    ? 'var(--clr-accent)'
                    : 'var(--text-primary)',
              }}
            >
              {cloudConfig.status}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Synced Blocks: </span>
            <strong>{cloudTelemetry.synchronizedBlockCount}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Remote: </span>
            <strong style={{ color: 'var(--clr-accent)' }}>
              {formatBytes(cloudTelemetry.totalRemoteBytes)}
            </strong>
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleOpenCockpit}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Sliders size={13} />
          <span>Open BYOS Cloud Cockpit &amp; Latency Drill</span>
        </button>
      </div>

      {/* ── BYO-AI Zero-Knowledge Registry ─────────────────── */}
      <div
        style={{
          padding: 'var(--sp-5)',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Cpu size={16} color="var(--clr-accent)" />
            <h3 className="type-title" style={{ fontSize: 'var(--text-sm)' }}>
              BYO-AI (Zero-Knowledge AI) Registry
            </h3>
          </div>
          <span className="label-mono" style={{ color: 'var(--clr-positive)', fontSize: '0.62rem' }}>
            DIRECT FETCH ONLY
          </span>
        </div>

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Store your local API keys for Google Gemini, Claude, OpenAI, or local Ollama.
          Requests execute strictly client-side via direct fetch. Zero server telemetry.
        </p>

        {/* AI Provider Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-2)' }}>
          {(['GEMINI', 'CLAUDE', 'OPENAI', 'OLLAMA'] as const).map((p) => (
            <button
              key={p}
              type="button"
              className={`btn btn-xs ${byoAi.provider === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { TactileSoundEngine.playClick(); setByoAi({ ...byoAi, provider: p }); }}
              style={{ fontSize: '0.62rem', padding: '6px 2px' }}
            >
              {p}
            </button>
          ))}
        </div>

        <div>
          <label className="label-overline">API Key / Enclave Token</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              value={byoAi.apiKeyMasked}
              onChange={(e) => setByoAi({ ...byoAi, apiKeyMasked: e.target.value })}
              style={{
                width: '100%',
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
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={13} color="var(--clr-positive)" />
          <span>Active Provider: <strong style={{ color: 'var(--text-primary)' }}>{activeProvider}</strong> ({configs[activeProvider]?.encryptedKey ? 'Key Sealed' : 'Key Unset'})</span>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleSaveAi}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Sparkles size={13} />
          Configure BYO-AI & PII Scrubber
        </button>
      </div>
    </div>
  );
};
