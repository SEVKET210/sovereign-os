/* ============================================================
   SOVEREIGN-OS — RAM-Only File Previewer Modal
   Diskless in-memory assembly viewer with volatile destruction protocol.
   Supports image, PDF, syntax-highlighted code/markdown, and hex inspection.
   ============================================================ */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  Lock,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileCode,
  CheckCircle2,
  Copy,
  Check,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sun,
  AlertTriangle,
} from 'lucide-react';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

export const RamFilePreviewModal: React.FC = () => {
  const activePreview = useVaultStore((state) => state.activePreview);
  const closePreview = useVaultStore((state) => state.closePreview);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'hex' | 'manifest'>('content');
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [invertContrast, setInvertContrast] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Lifecycle Unmount Protocol (P3.11):
  // Guarantees that route transitions, modal unmounting, or navigation
  // immediately revokes the object URL and scrubs all decrypted buffers from volatile RAM
  useEffect(() => {
    return () => {
      closePreview();
    };
  }, [closePreview]);

  const manifest = activePreview?.manifest;
  const isImage = manifest?.mimeType.startsWith('image/');
  const isPdf = manifest?.mimeType === 'application/pdf';
  const isText =
    manifest?.mimeType.startsWith('text/') ||
    manifest?.mimeType.includes('json') ||
    manifest?.mimeType.includes('javascript') ||
    manifest?.mimeType.includes('typescript') ||
    manifest?.originalFileName.endsWith('.txt') ||
    manifest?.originalFileName.endsWith('.md') ||
    manifest?.originalFileName.endsWith('.json') ||
    manifest?.originalFileName.endsWith('.ts') ||
    manifest?.originalFileName.endsWith('.tsx') ||
    manifest?.originalFileName.endsWith('.py') ||
    manifest?.originalFileName.endsWith('.css');

  useEffect(() => {
    if (activePreview && isText) {
      try {
        const text = new TextDecoder().decode(activePreview.reconstructedBuffer);
        setTextContent(text);
      } catch {
        setTextContent('// Unable to decode plaintext buffer.');
      }
    } else {
      setTextContent(null);
    }
  }, [activePreview, isText]);

  // Generate 16-byte aligned Hex Dump with ASCII decode column
  const hexDumpRows = useMemo(() => {
    if (!activePreview) return [];
    const slice = activePreview.reconstructedBuffer.slice(0, 512);
    const rows: Array<{ offset: string; hex: string; ascii: string }> = [];

    for (let i = 0; i < slice.length; i += 16) {
      const offset = i.toString(16).padStart(8, '0').toUpperCase();
      const chunk = slice.subarray(i, i + 16);
      const hexParts: string[] = [];
      let ascii = '';

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          hexParts.push(chunk[j].toString(16).padStart(2, '0').toUpperCase());
          // Printable ASCII 32..126
          ascii += chunk[j] >= 32 && chunk[j] <= 126 ? String.fromCharCode(chunk[j]) : '.';
        } else {
          hexParts.push('  ');
          ascii += ' ';
        }
      }

      rows.push({
        offset,
        hex: `${hexParts.slice(0, 8).join(' ')}  ${hexParts.slice(8).join(' ')}`,
        ascii,
      });
    }

    return rows;
  }, [activePreview]);

  if (!activePreview || !manifest) return null;

  const handleClose = () => {
    TactileSoundEngine.playVaultLock();
    closePreview();
  };

  const handleCopyText = () => {
    if (!textContent) return;
    navigator.clipboard.writeText(textContent);
    TactileSoundEngine.playMechanicalTransient();
    setCopiedCode(true);
    showToast('Decrypted buffer copied to clipboard.', 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadEphemeral = () => {
    TactileSoundEngine.playMechanicalTransient();
    const a = document.createElement('a');
    a.href = activePreview.objectUrl;
    a.download = manifest.originalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Ephemeral download initiated for ${manifest.originalFileName}.`, 'success');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sp-6)',
      }}
    >
      {/* Scrim with focus vignette */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 5, 7, 0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />

      {/* Surface Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1040,
          maxHeight: '92vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1,
          animation: 'enter-up var(--dur-base) var(--ease-out) both',
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            padding: 'var(--sp-3) var(--sp-6)',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sp-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0 }}>
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
                flexShrink: 0,
              }}
            >
              {isImage ? (
                <ImageIcon size={15} color="var(--clr-accent)" />
              ) : isText ? (
                <FileText size={15} color="var(--clr-accent)" />
              ) : (
                <FileCode size={15} color="var(--clr-accent)" />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {manifest.originalFileName}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.66rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  {manifest.trueByteLength >= 1048576
                    ? `${(manifest.trueByteLength / 1048576).toFixed(2)} MB`
                    : `${(manifest.trueByteLength / 1024).toFixed(1)} KB`}
                </span>
                <span>•</span>
                <span>{manifest.totalChunks} × 4MB BLOCKS</span>
                <span>•</span>
                <span style={{ color: 'var(--clr-positive)' }}>RAM STREAM DECRYPTED</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--clr-accent)',
              }}
            >
              <Shield size={11} />
              <span>CLEARANCE: LEVEL-{manifest.clearanceLevel}</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                color: 'var(--clr-caution)',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
              }}
              title="Copying or downloading writes plaintext outside this app's control — OS clipboard history and your Downloads folder are outside the zero-trust boundary."
            >
              <AlertTriangle size={11} />
              <span>Export Warning: Plaintext leaves zero-trust boundary</span>
            </div>

            <button
              className="btn btn-secondary btn-xs"
              onClick={handleDownloadEphemeral}
              title="Download ephemeral file (Writes plaintext to your Downloads folder, outside the zero-trust boundary)"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.64rem' }}
            >
              <Download size={11} />
              <span>Download</span>
            </button>

            <button
              className="btn btn-ghost btn-xs"
              onClick={handleClose}
              style={{ padding: 4 }}
              title="Close and scrub volatile RAM"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Controls & Telemetry Sub-ribbon */}
        <div
          style={{
            padding: '4px var(--sp-6)',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => {
                TactileSoundEngine.playClick();
                setActiveTab('content');
              }}
              style={{
                padding: '4px 10px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'content' ? 'var(--bg-primary)' : 'transparent',
                border: `1px solid ${activeTab === 'content' ? 'var(--border-moderate)' : 'transparent'}`,
                color: activeTab === 'content' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              IN-MEMORY PREVIEW
            </button>
            <button
              onClick={() => {
                TactileSoundEngine.playClick();
                setActiveTab('hex');
              }}
              style={{
                padding: '4px 10px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'hex' ? 'var(--bg-primary)' : 'transparent',
                border: `1px solid ${activeTab === 'hex' ? 'var(--border-moderate)' : 'transparent'}`,
                color: activeTab === 'hex' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              HEX DUMP STREAM
            </button>
            <button
              onClick={() => {
                TactileSoundEngine.playClick();
                setActiveTab('manifest');
              }}
              style={{
                padding: '4px 10px',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'manifest' ? 'var(--bg-primary)' : 'transparent',
                border: `1px solid ${activeTab === 'manifest' ? 'var(--border-moderate)' : 'transparent'}`,
                color: activeTab === 'manifest' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              FRAGMENT MANIFEST
            </button>
          </div>

          {/* Contextual Toolbar for Image & Code Views */}
          {activeTab === 'content' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isImage && (
                <>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setImageZoom((prev) => Math.max(50, prev - 25))}
                    title="Zoom Out"
                    style={{ padding: '2px 6px' }}
                  >
                    <ZoomOut size={12} />
                  </button>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {imageZoom}%
                  </span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setImageZoom((prev) => Math.min(250, prev + 25))}
                    title="Zoom In"
                    style={{ padding: '2px 6px' }}
                  >
                    <ZoomIn size={12} />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setImageZoom(100)}
                    title="Fit to Screen"
                    style={{ padding: '2px 6px' }}
                  >
                    <Maximize2 size={12} />
                  </button>
                  <button
                    className={`btn btn-xs ${invertContrast ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setInvertContrast((prev) => !prev)}
                    title="Forensic High-Contrast Inversion"
                    style={{ padding: '2px 6px' }}
                  >
                    <Sun size={12} />
                  </button>
                </>
              )}

              {isText && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={handleCopyText}
                    title="Copying plaintext writes unencrypted data to your OS clipboard history, which is outside the zero-trust boundary."
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem' }}
                  >
                    {copiedCode ? <Check size={11} color="var(--clr-positive)" /> : <Copy size={11} />}
                    <span>{copiedCode ? 'Copied' : 'Copy Plaintext'}</span>
                  </button>
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--clr-caution)',
                      opacity: 0.9,
                    }}
                    title="OS clipboard history is outside the zero-trust boundary"
                  >
                    (Clipboard leaves zero-trust boundary)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--sp-6)',
            background: 'var(--bg-secondary)',
            minHeight: 420,
          }}
        >
          {activeTab === 'content' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 380,
                width: '100%',
              }}
            >
              {isImage ? (
                <div
                  style={{
                    overflow: 'auto',
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--sp-4)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                  }}
                >
                  <img
                    src={activePreview.objectUrl}
                    alt={manifest.originalFileName}
                    style={{
                      transform: `scale(${imageZoom / 100})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease-out',
                      filter: invertContrast ? 'invert(1) contrast(1.3)' : 'none',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: 'var(--shadow-lg)',
                      maxWidth: '100%',
                    }}
                  />
                </div>
              ) : isPdf ? (
                <div style={{ width: '100%', height: '68vh', display: 'flex', flexDirection: 'column' }}>
                  <iframe
                    src={activePreview.objectUrl}
                    title={manifest.originalFileName}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      background: '#1a1a1a',
                    }}
                  />
                </div>
              ) : textContent !== null ? (
                <div
                  style={{
                    width: '100%',
                    maxHeight: '65vh',
                    overflowY: 'auto',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    lineHeight: 1.6,
                  }}
                >
                  {/* Line Numbers Gutter */}
                  <div
                    style={{
                      padding: 'var(--sp-4) var(--sp-2)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRight: '1px solid var(--border-hairline)',
                      color: 'var(--text-muted)',
                      userSelect: 'none',
                      textAlign: 'right',
                      minWidth: 42,
                    }}
                  >
                    {textContent.split('\n').map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>

                  {/* Code Body */}
                  <pre
                    style={{
                      flex: 1,
                      margin: 0,
                      padding: 'var(--sp-4)',
                      color: 'var(--text-primary)',
                      overflowX: 'auto',
                      whiteSpace: 'pre',
                    }}
                  >
                    {textContent}
                  </pre>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--sp-12)' }}>
                  <FileCode size={44} color="var(--clr-accent)" style={{ marginBottom: 14 }} />
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Binary Payload Reconstructed in Volatile RAM
                  </div>
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      maxWidth: 460,
                      margin: '8px auto 16px',
                    }}
                  >
                    This file classification ({manifest.mimeType}) does not have an inline browser visualizer.
                    You may inspect its raw cryptographic hex stream, verify chunk descriptors, or trigger an
                    in-memory download.
                  </p>
                  <button className="btn btn-secondary btn-xs" onClick={handleDownloadEphemeral}>
                    <Download size={12} />
                    <span>Download Binary Stream</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'hex' && (
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>// FIRST 512 BYTES RECONSTRUCTED FROM 4MB CHUNKS:</span>
                <span>OFFSET &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; HEX BYTES &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ASCII</span>
              </div>
              <div
                style={{
                  background: 'var(--bg-primary)',
                  padding: 'var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  lineHeight: 1.7,
                  color: 'var(--clr-accent)',
                  overflowX: 'auto',
                }}
              >
                {hexDumpRows.map((row, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16 }}>
                    <span style={{ color: 'var(--text-muted)', userSelect: 'none' }}>{row.offset}:</span>
                    <span style={{ color: 'var(--clr-accent)' }}>{row.hex}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>|{row.ascii}|</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 'var(--sp-3)',
                }}
              >
                <div
                  style={{
                    padding: 'var(--sp-3)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>MANIFEST UUID</div>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {manifest.manifestId}
                  </div>
                </div>
                <div
                  style={{
                    padding: 'var(--sp-3)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>HMAC INTEGRITY SIGNATURE</div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {manifest.integritySignature}
                  </div>
                </div>
                <div
                  style={{
                    padding: 'var(--sp-3)',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>TRUE UNPADDED BYTES</div>
                  <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {manifest.trueByteLength.toLocaleString()} BYTES
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                BLIND CHUNK INVENTORY ({manifest.chunkIndex.length} CHUNKS):
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {manifest.chunkIndex.map((chunk) => (
                  <div
                    key={chunk.chunkSequence}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 12px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={12} color="var(--clr-positive)" />
                      <span>FRAGMENT #{chunk.chunkSequence + 1}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        ({((chunk.byteRange[1] - chunk.byteRange[0]) / 1048576).toFixed(2)} MB unpadded)
                      </span>
                    </div>
                    <span style={{ color: 'var(--clr-accent)' }}>{chunk.chunkHash}.bin</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Volatile Destruction Action */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            <Lock size={12} color="var(--clr-positive)" />
            <span>ZERO DISK PERSISTENCE // RAM MEMORY DESTROY PROTOCOL READY</span>
          </div>

          <button
            className="btn btn-secondary btn-xs"
            onClick={handleClose}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--clr-negative)' }}
          >
            <Trash2 size={12} />
            <span>Volatile Memory Wipe &amp; Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
