import React from 'react';
import { HardDrive, Eye, Binary } from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

interface EmbeddedVaultManifestProps {
  manifestId: string;
}

export const EmbeddedVaultManifest: React.FC<EmbeddedVaultManifestProps> = ({ manifestId }) => {
  const openRamPreview = useCommsStore((state) => state.openRamPreview);
  const manifests = useVaultStore((state) => state.manifests);
  const found = manifests.find((m) => m.manifestId === manifestId);

  // Manifest metadata representation
  const fileData = {
    fileName: found ? found.originalFileName : `MANIFEST-${manifestId.slice(0, 8)}.bin.enc`,
    fileSize: found ? found.trueByteLength : 0,
    mimeType: found ? found.mimeType : 'application/octet-stream',
    clearance: found ? found.clearanceLevel : 1,
    cipher: 'AES-256-GCM',
    fragmentCount: found ? found.totalChunks : 1,
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    TactileSoundEngine.playClick();
    openRamPreview(fileData);
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: '10px 12px',
        background: 'rgba(var(--bg-secondary-raw, 13 22 40) / 0.75)',
        border: '1px solid var(--border-moderate)',
        borderRadius: 'var(--radius-md)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              flexShrink: 0,
            }}
          >
            <HardDrive size={12} />
          </div>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {fileData.fileName}
          </span>
        </div>

        <span
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: '#f59e0b',
            background: 'rgba(245, 158, 11, 0.12)',
            padding: '2px 6px',
            borderRadius: 2,
            border: '1px solid rgba(245, 158, 11, 0.3)',
            flexShrink: 0,
          }}
        >
          CLEARANCE // L{fileData.clearance}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.68rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          marginBottom: 8,
        }}
      >
        <span>SIZE: {formatBytes(fileData.fileSize)}</span>
        <span>CIPHER: {fileData.cipher}</span>
        <span>FRAGMENTS: {fileData.fragmentCount}</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-hairline)',
          paddingTop: 6,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
            color: '#10b981',
          }}
        >
          <Binary size={10} />
          <span>DISKLESS RAM ATTESTATION READY</span>
        </span>

        <button
          onClick={handlePreviewClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--clr-accent)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Eye size={11} />
          <span>RAM PREVIEW</span>
        </button>
      </div>
    </div>
  );
};
