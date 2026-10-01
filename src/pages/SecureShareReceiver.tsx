/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Secure Share Link Receiver
   Standalone Decryption & Reconstitution View for External Collaborators.
   Extracts decryption keys strictly from URL hash fragments (#key=...).
   Enforces single-use burn-on-download and zero-disk-write RAM assembly.
   ============================================================ */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Lock,
  Download,
  Eye,
  Shield,
  Clock,
  Flame,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { EphemeralShareService } from '../services/storage/EphemeralShareService';
import { MemorySanitizer } from '../services/crypto/MemorySanitizer';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { showToast } from '../components/Toast';
import type { EphemeralShareRecord, FileManifest } from '../types';

export const SecureShareReceiver: React.FC = () => {
  const { shareId: paramShareId, shareKeyHex: paramShareKeyHex } = useParams<{
    shareId?: string;
    shareKeyHex?: string;
  }>();
  const [shareRecord, setShareRecord] = useState<EphemeralShareRecord | null>(null);
  const [shareKeyHex, setShareKeyHex] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // In-Memory preview state
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewManifest, setPreviewManifest] = useState<FileManifest | null>(null);
  const [previewBuffer, setPreviewBuffer] = useState<Uint8Array | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  // Extract shareId and shareKeyHex directly from route path segments
  // Format: /#/vault/share/${shareId}/${shareKeyHex}
  useEffect(() => {
    let id = paramShareId || '';
    let key = paramShareKeyHex || '';

    // Direct path-segment parsing from route path if not passed by router params
    if (!id || !key) {
      const fullPath = (window.location.hash || window.location.pathname).replace(/^#\/?/, '');
      const sharePrefix = 'vault/share/';
      const idx = fullPath.indexOf(sharePrefix);
      if (idx !== -1) {
        const segments = fullPath.slice(idx + sharePrefix.length).split('/').filter(Boolean);
        if (!id && segments[0]) id = segments[0];
        if (!key && segments[1]) key = segments[1];
      }
    }

    setShareKeyHex(key);

    if (!id) {
      setErrorStatus('NO_SHARE_SPECIFIED');
      return;
    }

    const record = EphemeralShareService.fetchShareRecord(id);
    if (!record) {
      setErrorStatus('SHARE_NOT_FOUND');
      return;
    }

    setShareRecord(record);

    if (record.status === 'EXPIRED') {
      setErrorStatus('SHARE_EXPIRED');
    } else if (record.status === 'REVOKED') {
      setErrorStatus('SHARE_REVOKED');
    } else if (record.status === 'BURNED') {
      setErrorStatus('SHARE_BURNED');
    } else if (!key) {
      setErrorStatus('KEY_FRAGMENT_MISSING');
    }
  }, [paramShareId, paramShareKeyHex]);

  // Clean up object URL and zeroize memory on unmount
  useEffect(() => {
    return () => {
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
      }
      if (previewBuffer) {
        MemorySanitizer.zeroize(previewBuffer);
      }
    };
  }, [previewObjectUrl, previewBuffer]);

  // Handle Decrypt & Download in RAM
  const handleDownload = async () => {
    if (!shareRecord || !shareKeyHex) return;
    setIsDecrypting(true);

    try {
      TactileSoundEngine.playRollingKeyRefresh();
      const result = await EphemeralShareService.consumeAndDecryptShare(shareRecord.shareId, shareKeyHex);

      // Trigger ephemeral browser download
      const a = document.createElement('a');
      a.href = result.objectUrl;
      a.download = result.manifest.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      TactileSoundEngine.playMechanicalTransient();
      showToast(`Decrypted & downloaded ${result.manifest.originalFileName} purely in volatile RAM!`, 'success');

      // Refresh share record in state
      const updated = EphemeralShareService.fetchShareRecord(shareRecord.shareId);
      if (updated) {
        setShareRecord(updated);
        if (updated.status === 'BURNED') {
          setErrorStatus('SHARE_BURNED');
        }
      }

      // Memory zeroize download buffer
      setTimeout(() => {
        URL.revokeObjectURL(result.objectUrl);
        MemorySanitizer.zeroize(result.buffer);
      }, 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Decryption error';
      showToast(`Download failed: ${msg}`, 'warning');
      setErrorStatus(msg);
    } finally {
      setIsDecrypting(false);
    }
  };

  // Handle In-Memory Preview
  const handlePreview = async () => {
    if (!shareRecord || !shareKeyHex) return;
    setIsDecrypting(true);

    try {
      TactileSoundEngine.playRollingKeyRefresh();
      const result = await EphemeralShareService.consumeAndDecryptShare(shareRecord.shareId, shareKeyHex);

      setPreviewManifest(result.manifest);
      setPreviewObjectUrl(result.objectUrl);
      setPreviewBuffer(result.buffer);

      if (
        result.manifest.mimeType.startsWith('text/') ||
        result.manifest.mimeType.includes('json') ||
        result.manifest.originalFileName.endsWith('.ts') ||
        result.manifest.originalFileName.endsWith('.txt') ||
        result.manifest.originalFileName.endsWith('.md')
      ) {
        setTextContent(new TextDecoder().decode(result.buffer));
      } else {
        setTextContent(null);
      }

      TactileSoundEngine.playUnlockShimmer();
      showToast(`Reconstructed in RAM preview modal.`, 'info');

      // Refresh share record
      const updated = EphemeralShareService.fetchShareRecord(shareRecord.shareId);
      if (updated) {
        setShareRecord(updated);
        if (updated.status === 'BURNED') {
          setErrorStatus('SHARE_BURNED');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Decryption error';
      showToast(`Preview failed: ${msg}`, 'warning');
      setErrorStatus(msg);
    } finally {
      setIsDecrypting(false);
    }
  };

  const isImage = previewManifest?.mimeType.startsWith('image/');
  const isPdf = previewManifest?.mimeType === 'application/pdf';

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-6)',
      }}
    >
      {/* Background Matrix Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Header Ribbon */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={15} color="var(--clr-accent)" />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                SOVEREIGN-OS SECURE SHARE ENCLAVE
              </div>
              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                Zero-Knowledge Ephemeral Decryption Gateway
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              color: 'var(--clr-accent)',
            }}
          >
            <ShieldCheck size={11} />
            <span>RFC 3986 COMPLIANT</span>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {/* Error / Refusal Banners */}
          {errorStatus ? (
            <div
              style={{
                padding: 'var(--sp-6)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--clr-negative)' }}>
                <AlertTriangle size={18} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  CRYPTOGRAPHIC ACCESS REFUSED
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {errorStatus === 'SHARE_EXPIRED' &&
                  'The operational time window allocated for this encrypted sharing link has elapsed. The artifacts can no longer be decrypted.'}
                {errorStatus === 'SHARE_BURNED' &&
                  'Single-use download policy enforced. This document was configured to burn immediately upon the first successful retrieval.'}
                {errorStatus === 'SHARE_REVOKED' &&
                  'This sharing token was manually revoked by the enclave operator. All cryptographic authorizations have been purged.'}
                {errorStatus === 'KEY_FRAGMENT_MISSING' &&
                  'Zero-knowledge key missing from URL hash fragment. The key string (#key=...) was either omitted or stripped by your browser/client.'}
                {errorStatus === 'SHARE_NOT_FOUND' &&
                  'No valid sharing deed was found for this identifier in the host enclave.'}
                {errorStatus === 'NO_SHARE_SPECIFIED' && 'No sharing identifier provided in link parameter.'}
              </div>
            </div>
          ) : shareRecord ? (
            <>
              {/* Document Overview Card */}
              <div
                style={{
                  padding: 'var(--sp-5)',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {shareRecord.fileName}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginTop: 4,
                    }}
                  >
                    <span>{(shareRecord.trueByteLength / 1024).toFixed(1)} KB UNPADDED</span>
                    <span>•</span>
                    <span style={{ color: 'var(--clr-accent)' }}>LEVEL-{shareRecord.clearanceLevel}</span>
                    <span>•</span>
                    <span>{shareRecord.mimeType}</span>
                  </div>
                </div>

                {shareRecord.burnOnDownload && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(249, 115, 22, 0.12)',
                      border: '1px solid rgba(249, 115, 22, 0.4)',
                      color: '#f97316',
                      fontSize: '0.64rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                    }}
                  >
                    <Flame size={12} />
                    <span>BURN-ON-READ</span>
                  </div>
                )}
              </div>

              {/* Security Telemetry Strip */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.66rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} color="var(--clr-accent)" />
                  <span>EXPIRES: {new Date(shareRecord.expiresAt).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={12} color="var(--clr-positive)" />
                  <span>DEK ENVELOPE VERIFIED</span>
                </div>
              </div>

              {/* Action Triggers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleDownload}
                  disabled={isDecrypting}
                  style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: '0.74rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                >
                  <Download size={14} />
                  <span>{isDecrypting ? 'DECRYPTING 4MB BLOCKS...' : 'DECRYPT & DOWNLOAD'}</span>
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handlePreview}
                  disabled={isDecrypting}
                  style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: '0.74rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                >
                  <Eye size={14} />
                  <span>RAM PREVIEW</span>
                </button>
              </div>

              {/* Inline RAM Previewer if opened */}
              {previewObjectUrl && previewManifest && (
                <div
                  style={{
                    marginTop: 'var(--sp-3)',
                    padding: 'var(--sp-4)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-moderate)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      borderBottom: '1px solid var(--border-hairline)',
                      paddingBottom: 6,
                    }}
                  >
                    <span style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>VOLATILE RAM PREVIEW:</span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
                        if (previewBuffer) MemorySanitizer.zeroize(previewBuffer);
                        setPreviewObjectUrl(null);
                        setPreviewManifest(null);
                      }}
                      style={{ padding: '2px 6px', color: 'var(--clr-negative)' }}
                    >
                      Close &amp; Wipe RAM
                    </button>
                  </div>

                  <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                    {isImage ? (
                      <img
                        src={previewObjectUrl}
                        alt={previewManifest.originalFileName}
                        style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 'var(--radius-sm)' }}
                      />
                    ) : isPdf ? (
                      <iframe
                        src={previewObjectUrl}
                        title={previewManifest.originalFileName}
                        style={{ width: '100%', height: 320, border: 'none' }}
                      />
                    ) : textContent !== null ? (
                      <pre
                        style={{
                          margin: 0,
                          padding: 'var(--sp-3)',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          overflowX: 'auto',
                        }}
                      >
                        {textContent}
                      </pre>
                    ) : (
                      <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Binary reconstructed in volatile RAM. Ready for download.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Notice */}
        <div
          style={{
            padding: 'var(--sp-3) var(--sp-6)',
            background: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
          }}
        >
          <span>CLIENT-SIDE ENVELOPE RECONSTITUTION</span>
          <span style={{ color: 'var(--clr-accent)' }}>SOVEREIGN-OS ZERO-KNOWLEDGE PROTOCOL</span>
        </div>
      </div>
    </div>
  );
};
