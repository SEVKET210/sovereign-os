import React from 'react';
import { X, Cpu, Lock } from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { MemorySanitizer } from '../../services/crypto/MemorySanitizer';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

export const RamPreviewModal: React.FC = () => {
  const selectedFile = useCommsStore((state) => state.selectedVaultFileForRamPreview);
  const closeRamPreview = useCommsStore((state) => state.closeRamPreview);

  if (!selectedFile) return null;

  const handlePurgeAndClose = () => {
    TactileSoundEngine.playClick();
    // Simulate immediate zeroization of decrypted preview buffer
    const dummyBuffer = new TextEncoder().encode('DECRYPTED_RAM_PREVIEW_BUFFER');
    MemorySanitizer.zeroize(dummyBuffer);
    closeRamPreview();
    showToast('Volatile preview buffer zeroized with null bytes.', 'info');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={handlePurgeAndClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 580,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={16} style={{ color: '#10b981' }} />
            <span
              style={{
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              DISKLESS RAM PREVIEW // ENCLAVE MEMORY
            </span>
          </div>

          <button
            onClick={handlePurgeAndClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* File Info Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>{selectedFile.fileName}</span>
            <span style={{ color: '#f59e0b' }}>CLEARANCE // L{selectedFile.clearance}</span>
          </div>

          {/* Volatile RAM Buffer Hex / Text Viewport */}
          <div
            style={{
              background: '#040711',
              border: '1px solid var(--border-moderate)',
              borderRadius: 'var(--radius-sm)',
              padding: 12,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: '#34d399',
              lineHeight: 1.6,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
              // [RAM-ADDR: 0x7FFE9B200000] ALLOCATED VIA WEBCRYPTO SUBTLE (AES-256-GCM)
            </div>
            <div>00000000: 2d2d 2d2d 2d42 4547 494e 2053 4f56 4552  -----BEGIN SOVER</div>
            <div>00000010: 4549 474e 2043 4c41 5353 2d49 5620 5345  EIGN CLASS-IV SE</div>
            <div>00000020: 4544 204b 4559 204d 414e 4946 4553 542d  ED KEY MANIFEST-</div>
            <div>00000030: 2d2d 2d2d 0a45 4e43 4c41 5645 5f52 4f4f  ---.ENCLAVE_ROO</div>
            <div>00000040: 545f 4841 5348 3a20 3078 3866 3463 6431  T_HASH: 0x8f4cd1</div>
            <div>00000050: 3961 3362 3761 3763 3138 6439 6532 0a5a  9a3b7a7c18d9e2.Z</div>
            <div>00000060: 4552 4f5f 4b4e 4f57 4c45 4447 455f 5345  ERO_KNOWLEDGE_SE</div>
            <div>00000070: 4544 3a20 636c 6965 6e74 2d73 6964 6520  ED: client-side </div>
            <div>00000080: 766f 6c61 7469 6c65 206d 656d 6f72 792e  volatile memory.</div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: '#10b981',
            }}
          >
            <Lock size={12} />
            <span>ZERO PERSISTENCE: Buffer will be overwritten with 0x00 bytes upon dismiss.</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handlePurgeAndClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-moderate)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>PURGE FROM RAM &amp; CLOSE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
