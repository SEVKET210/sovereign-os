import React, { useState } from 'react';
import { FileCode, Eye, EyeOff, Shield, Lock, Unlock } from 'lucide-react';
import type { VaultFileNodeData, ClearanceLevel } from '../../../types';
import { TactileSoundEngine } from '../../../services/audio/TactileSoundEngine';
import { useVaultStore } from '../../../services/storage/useVaultStore';
import { ThreatDetectionEngine } from '../../../services/security/ThreatDetectionEngine';
import { showToast } from '../../Toast';

const CLEARANCE_RANKS: Record<ClearanceLevel, number> = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
};

export const VaultFileNode: React.FC<{
  node: VaultFileNodeData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (node: VaultFileNodeData) => void;
}> = ({ node, isSelected, onSelect, onDoubleClick }) => {
  const [showPreview, setShowPreview] = useState(false);
  const activeClearance = useVaultStore((state) => state.activeClearance);
  const manifests = useVaultStore((state) => state.manifests);
  const previewFile = useVaultStore((state) => state.previewFile);

  const operatorRank = CLEARANCE_RANKS[activeClearance];
  const nodeRank = CLEARANCE_RANKS[node.clearance];
  const isLocked = operatorRank < nodeRank;

  const togglePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      TactileSoundEngine.playClick();
      showToast(`Clearance ${node.clearance} required to decrypt preview.`, 'warning');
      ThreatDetectionEngine.recordClearanceViolation(node.clearance, activeClearance, node.id);
      return;
    }
    TactileSoundEngine.playClick();
    setShowPreview(!showPreview);
  };

  const handleNodeDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      TactileSoundEngine.playClick();
      showToast(`Security Violation: Clearance ${node.clearance} required.`, 'warning');
      ThreatDetectionEngine.recordClearanceViolation(node.clearance, activeClearance, node.id);
      return;
    }

    // Procedural 1200 Hz -> 2400 Hz WebAudio unlock tone
    TactileSoundEngine.playRollingKeyRefresh();

    // Check if bound to a vault manifest
    const boundManifest = manifests.find(
      (m) => m.manifestId === node.manifestId || m.chunkIndex.some((c) => c.chunkHash === node.fileHash)
    );

    if (boundManifest) {
      previewFile(boundManifest);
    } else {
      // Ephemeral manifest wrapper for canvas node preview
      const ephemeralManifest = {
        manifestId: node.manifestId || `node_manifest_${node.id}`,
        originalFileName: `${node.title}.bin`,
        mimeType: 'application/octet-stream',
        trueByteLength: node.sizeBytes,
        totalChunks: node.fragmentCount,
        chunkIndex: [
          {
            chunkSequence: 0,
            chunkHash: node.fileHash,
            byteRange: [0, node.sizeBytes] as [number, number],
          },
        ],
        clearanceLevel: nodeRank,
        createdAt: new Date().toISOString(),
        integritySignature: 'SIG-CANVAS-VAULT',
      };
      previewFile(ephemeralManifest);
    }

    onDoubleClick(node);
  };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      onDoubleClick={handleNodeDoubleClick}
      style={{
        position: 'relative',
        width: '100%',
        background: isLocked ? 'rgba(15, 15, 20, 0.95)' : 'var(--bg-secondary)',
        border: `1px solid ${isSelected ? 'var(--border-strong)' : isLocked ? 'var(--border-hairline)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        userSelect: 'none',
        overflow: 'hidden',
        opacity: isLocked ? 0.75 : 1.0,
      }}
    >
      {/* Node Header */}
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileCode size={13} color="var(--clr-indicator)" />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {node.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isLocked ? (
            <Lock size={11} color="var(--clr-caution)" />
          ) : (
            <Unlock size={11} color="var(--clr-positive)" />
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              padding: '1px 5px',
              borderRadius: 2,
              background: isLocked ? 'var(--clr-caution-alpha)' : 'var(--clr-positive-alpha)',
              color: isLocked ? 'var(--clr-caution)' : 'var(--clr-positive)',
            }}
          >
            {isLocked ? 'LOCKED' : node.cipher}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>SIZE: {(node.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
          <span>FRAGMENTS: {node.fragmentCount} CHUNKS</span>
        </div>

        <div
          style={{
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            background: 'var(--bg-primary)',
            padding: '4px 6px',
            borderRadius: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          HASH: {node.fileHash}
        </div>

        {/* RAM-Only Preview Toggle */}
        <button
          className={`btn ${isLocked ? 'btn-ghost' : 'btn-secondary'} btn-xs`}
          onClick={togglePreview}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: '0.68rem' }}
        >
          {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
          {isLocked ? 'Encrypted (Access Locked)' : showPreview ? 'Wipe RAM Preview' : 'Decrypt In-Memory Preview'}
        </button>

        {showPreview && !isLocked && (
          <div
            className="anim-ticker-in"
            style={{
              padding: '6px 8px',
              background: 'var(--bg-primary)',
              borderRadius: 3,
              border: '1px solid var(--border-hairline)',
              fontSize: '0.64rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--clr-indicator)',
              maxHeight: 70,
              overflowY: 'auto',
            }}
          >
            {node.inMemoryDecryptedPreview || '// ENCRYPTED INGESTION POINTER: AES-GCM-256 payload verified in volatile RAM.'}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={10} color="var(--clr-accent)" />
            <span>{node.clearance}</span>
          </div>
          <span>2x click to launch previewer</span>
        </div>
      </div>
    </div>
  );
};
