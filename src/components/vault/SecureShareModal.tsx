/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Ephemeral Share Modal
   Generates single-use and time-bound share links anchored strictly
   in URL hash fragments (#key=...). Enforces clearance gating,
   real-time countdowns, and instant cryptographic revocation.
   ============================================================ */

import React, { useState } from 'react';
import {
  X,
  Share2,
  Lock,
  Clock,
  Flame,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { ShareExpirationOption } from '../../types';

export const SecureShareModal: React.FC = () => {
  const manifest = useVaultStore((state) => state.activeShareModalManifest);
  const closeShareModal = useVaultStore((state) => state.closeShareModal);
  const activeClearance = useVaultStore((state) => state.activeClearance);
  const activeShares = useVaultStore((state) => state.activeShares);
  const generateShareLink = useVaultStore((state) => state.generateShareLink);
  const revokeShareLink = useVaultStore((state) => state.revokeShareLink);

  const [expiration, setExpiration] = useState<ShareExpirationOption>('24h');
  const [burnOnDownload, setBurnOnDownload] = useState<boolean>(true);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!manifest) return null;

  const clearanceNumeric =
    activeClearance === 'LEVEL_1' ? 1 : activeClearance === 'LEVEL_2' ? 2 : activeClearance === 'LEVEL_3' ? 3 : 4;
  const isClearanceSufficient = clearanceNumeric >= manifest.clearanceLevel;

  // Filter existing shares for this file
  const fileShares = activeShares.filter((s) => s.manifestId === manifest.manifestId);

  const handleGenerate = async () => {
    if (!isClearanceSufficient) {
      showToast('Insufficient clearance to generate share link.', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateShareLink(manifest, {
        expiration,
        burnOnDownload,
      });
      setGeneratedUrl(result.shareUrl);
      showToast('Zero-knowledge ephemeral share link created!', 'success');
    } catch (err) {
      showToast(`Share generation failed: ${err instanceof Error ? err.message : 'Crypto error'}`, 'warning');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    TactileSoundEngine.playMechanicalTransient();
    setCopied(true);
    showToast('Zero-knowledge link copied to clipboard.', 'info');
    setTimeout(() => setCopied(false), 2000);
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
      {/* Backdrop */}
      <div
        onClick={closeShareModal}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 5, 7, 0.85)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Surface Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 680,
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
              <Share2 size={16} color="var(--clr-accent)" />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                Zero-Knowledge Ephemeral Share Link
              </div>
              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {manifest.originalFileName} • LEVEL-{manifest.clearanceLevel}
              </div>
            </div>
          </div>

          <button className="btn btn-ghost btn-xs" onClick={closeShareModal} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {/* Clearance Verification Alert */}
          {!isClearanceSufficient ? (
            <div
              style={{
                padding: 'var(--sp-4)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <ShieldAlert size={18} color="var(--clr-negative)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--clr-negative)' }}>
                  Clearance Elevation Required
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Your current session is operating at {activeClearance}, but this document is classified as Level-
                  {manifest.clearanceLevel}. Ephemeral link generation is cryptographically forbidden.
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Zero-Knowledge Invariant Callout */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}
              >
                <Lock size={14} color="var(--clr-accent)" style={{ flexShrink: 0 }} />
                <span>
                  RFC 3986 INVARIANT: Decryption key is anchored in the URL hash fragment (#key=...).
                  Web servers never receive or log this key.
                </span>
              </div>

              {/* Generator Configuration Options */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 'var(--sp-4)',
                  padding: 'var(--sp-4)',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Expiration Select */}
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    <Clock size={12} color="var(--clr-accent)" />
                    <span>LIFECYCLE TIMEFRAME:</span>
                  </label>
                  <select
                    value={expiration}
                    onChange={(e) => setExpiration(e.target.value as ShareExpirationOption)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.74rem',
                      outline: 'none',
                    }}
                  >
                    <option value="1h">1 Hour Ephemeral Window</option>
                    <option value="24h">24 Hours Standard Window</option>
                    <option value="7d">7 Days Extended Escrow</option>
                  </select>
                </div>

                {/* Burn-on-Download Toggle */}
                <div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    <Flame size={12} color="#f97316" />
                    <span>SINGLE-USE POLICY:</span>
                  </label>
                  <div
                    onClick={() => setBurnOnDownload((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${burnOnDownload ? '#f97316' : 'var(--border-moderate)'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={burnOnDownload}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', accentColor: '#f97316' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: burnOnDownload ? '#f97316' : 'var(--text-muted)' }}>
                      Burn Immediately on First Download
                    </span>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <Lock size={13} />
                <span>{isGenerating ? 'SEALING DECRYPT KEYS...' : 'GENERATE ZERO-KNOWLEDGE SHARE LINK'}</span>
              </button>

              {/* Generated URL Box */}
              {generatedUrl && (
                <div
                  style={{
                    padding: 'var(--sp-4)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--clr-accent)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    animation: 'enter-up 0.2s ease-out both',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.66rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span style={{ color: 'var(--clr-accent)', fontWeight: 600 }}>AUTHENTICATED SHARING URL:</span>
                    <span style={{ color: 'var(--clr-positive)' }}>READY FOR TRANSMISSION</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--bg-secondary)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {generatedUrl}
                    </span>
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={handleCopyLink}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Shares List for this file */}
              {fileShares.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      marginBottom: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>ACTIVE / HISTORICAL SHARE DEEDS ({fileShares.length}):</span>
                    <span>AUTOMATED MONITORING</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {fileShares.map((share) => {
                      const isExpired = Date.now() > share.expiresAt;
                      const isActive = share.status === 'ACTIVE' && !isExpired;

                      return (
                        <div
                          key={share.shareId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.66rem',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: 2,
                                background: isActive ? 'rgba(78, 242, 210, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: isActive ? 'var(--clr-accent)' : 'var(--text-muted)',
                                fontWeight: 600,
                              }}
                            >
                              {share.status}
                            </span>
                            <span>{new Date(share.createdAt).toLocaleTimeString()}</span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {share.burnOnDownload ? 'Single-Use Burn' : 'Multi-Download'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isActive && (
                              <button
                                className="btn btn-ghost btn-xs"
                                onClick={() => revokeShareLink(share.shareId)}
                                style={{ color: 'var(--clr-negative)', padding: '2px 6px', fontSize: '0.6rem' }}
                                title="Instantly revoke this share link"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
