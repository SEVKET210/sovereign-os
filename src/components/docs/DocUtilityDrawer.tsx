import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  ShieldCheck,
  ListTree,
  ExternalLink,
  FileSignature,
  Copy,
  Check,
} from 'lucide-react';
import { useDocsStore } from '../../stores/useDocsStore';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

export const DocUtilityDrawer: React.FC = () => {
  const navigate = useNavigate();
  const isUtilityDrawerOpen = useDocsStore((state) => state.isUtilityDrawerOpen);
  const activeDocumentId = useDocsStore((state) => state.activeDocumentId);
  const documents = useDocsStore((state) => state.documents);
  const bindDocumentToDagNode = useDocsStore((state) => state.bindDocumentToDagNode);
  const sealDocumentToLedger = useDocsStore((state) => state.sealDocumentToLedger);

  const blueprintNodes = useBlueprintStore((state) => state.nodes);
  const setSelectedNodeId = useBlueprintStore((state) => state.setSelectedNodeId);
  const setViewMode = useKanbanStore((state) => state.setViewMode);

  const { hasPermission } = usePermissionStore();
  const canEdit = hasPermission('docs:edit');
  const canSeal = hasPermission('docs:seal');

  const [activeTab, setActiveTab] = useState<'dag' | 'seal' | 'outline'>('dag');
  const [sealReason, setSealReason] = useState('CORPORATE CHARTER FORMAL RATIFICATION');
  const [isSealing, setIsSealing] = useState(false);
  const [copiedDigest, setCopiedDigest] = useState(false);

  if (!isUtilityDrawerOpen) return null;

  const doc = documents.find((d) => d.id === activeDocumentId);
  if (!doc) {
    return (
      <aside
        style={{
          width: 280,
          minWidth: 280,
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-hairline)',
          padding: 16,
          color: 'var(--text-muted)',
          fontSize: '0.74rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        NO ACTIVE DOCUMENT SELECTED
      </aside>
    );
  }

  const boundNode = blueprintNodes.find((n) => n.id === doc.boundBlueprintNodeId);

  const handleJumpToNode = () => {
    if (!doc.boundBlueprintNodeId) return;
    TactileSoundEngine.playMechanicalTransient();
    setSelectedNodeId(doc.boundBlueprintNodeId);
    setViewMode('canvas');
    navigate('/blueprint');
  };

  const handleSealDocument = async () => {
    if (!canSeal) {
      showToast('Yetki hatası: Belge mühürleme yetkiniz yok.', 'error');
      return;
    }
    if (!sealReason.trim() || isSealing) return;
    setIsSealing(true);
    try {
      await sealDocumentToLedger(doc.id, sealReason.trim());
    } finally {
      setIsSealing(false);
    }
  };

  const handleCopyDigest = (digest: string) => {
    TactileSoundEngine.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(digest);
      setCopiedDigest(true);
      showToast('SHA-256 document digest copied.', 'info');
      setTimeout(() => setCopiedDigest(false), 2000);
    }
  };

  // Extract headings for document outline
  const outlineHeadings = doc.content
    .split('\n')
    .filter((l) => l.trim().startsWith('#'))
    .map((l) => {
      const match = l.trim().match(/^(#{1,4})\s+(.+)$/);
      return match ? { level: match[1].length, text: match[2] } : null;
    })
    .filter((h): h is { level: number; text: string } => Boolean(h));

  const wordCount = doc.content.trim() ? doc.content.trim().split(/\s+/).length : 0;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  return (
    <aside
      style={{
        width: 280,
        minWidth: 280,
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-hairline)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header & Tabs */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            DOCUMENT UTILITY ENCLAVE
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--clr-accent)',
            }}
          >
            ZK ACTIVE
          </span>
        </div>

        {/* Tab Controls */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 2,
            gap: 2,
          }}
        >
          {[
            { id: 'dag', label: 'DAG BINDING', icon: <GitBranch size={10} /> },
            { id: 'seal', label: 'LEDGER SEAL', icon: <ShieldCheck size={10} /> },
            { id: 'outline', label: 'OUTLINE', icon: <ListTree size={10} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                TactileSoundEngine.playClick();
                setActiveTab(tab.id as any);
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '4px 2px',
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? 'var(--clr-accent)' : 'var(--text-muted)',
                background: activeTab === tab.id ? 'var(--bg-secondary)' : 'transparent',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* ── Tab 1: Blueprint DAG Binding ─────────────────────── */}
        {activeTab === 'dag' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Bind this document directly to a Blueprint DAG task node to synchronize milestone signoffs and visual progress.
            </div>

            {/* Currently Bound Node Card */}
            {boundNode ? (
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: '#60a5fa',
                    }}
                  >
                    BOUND TO DAG NODE
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontFamily: 'var(--font-mono)',
                      color: boundNode.status === 'completed' ? '#10b981' : '#3b82f6',
                    }}
                  >
                    {boundNode.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {boundNode.title}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={handleJumpToNode}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--clr-accent)',
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span>JUMP TO CANVAS</span>
                    <ExternalLink size={10} />
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => bindDocumentToDagNode(doc.id, undefined)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.64rem',
                        cursor: 'pointer',
                      }}
                    >
                      UNBIND
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                }}
              >
                NO DAG NODE CURRENTLY BOUND
              </div>
            )}

            {/* Choose DAG Node to Bind */}
            {canEdit && (
              <div>
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  AVAILABLE BLUEPRINT NODES:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {blueprintNodes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => bindDocumentToDagNode(doc.id, n.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        background: 'var(--bg-surface)',
                        border: `1px solid ${doc.boundBlueprintNodeId === n.id ? 'var(--clr-accent)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 170 }}>
                        {n.title}
                      </span>
                      <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {n.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Document Sealing into Chained Ledger ─────── */}
        {activeTab === 'seal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Execute cryptographic document ratification. Commits document digest, author, and timestamp into the Treasury Double-Entry Chained Hash Ledger with a 65 Hz sub-bass audio lock.
            </div>

            {/* Already Sealed Banner */}
            {doc.isSealed && doc.sealLedgerBlock && (
              <div
                style={{
                  padding: 12,
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(18, 24, 38, 0.95) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.45)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={14} style={{ color: '#fbbf24' }} />
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fef3c7' }}>
                    SEALED RECORD // BLOCK #{doc.sealLedgerBlock.blockIndex}
                  </span>
                </div>

                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  {doc.sealLedgerBlock.mandateReason}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  <span>SIG: {doc.sealLedgerBlock.signatory.slice(0, 15)}...</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{doc.sealLedgerBlock.hash.slice(0, 8)}...</span>
                    <button
                      onClick={() => handleCopyDigest(doc.sealLedgerBlock!.hash)}
                      style={{ background: 'transparent', border: 'none', color: copiedDigest ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                    >
                      {copiedDigest ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Seal Form */}
            {!doc.isSealed && (
              canSeal ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 4 }}>
                      MANDATE RATIFICATION REASON:
                    </label>
                    <input
                      type="text"
                      value={sealReason}
                      onChange={(e) => setSealReason(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-moderate)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-sans)',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <button
                    onClick={handleSealDocument}
                    disabled={isSealing || !sealReason.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
                      border: '1px solid #fef3c7',
                      borderRadius: 'var(--radius-sm)',
                      color: '#000',
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      cursor: isSealing ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(212, 175, 55, 0.4)',
                    }}
                  >
                    <FileSignature size={13} />
                    <span>{isSealing ? 'SEALING RECORD...' : 'RATIFY & SEAL TO LEDGER (65Hz)'}</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#f87171',
                    lineHeight: 1.4,
                  }}
                >
                  🔒 <strong>YETKİ KISITI:</strong> Bu belgeyi Hazine Defterine mühürlemek için Yönetici (Lead Architect / Senior Operator) veya Kurucu (Founder) yetkisi gereklidir.
                </div>
              )
            )}
          </div>
        )}

        {/* ── Tab 3: Table of Contents & Telemetry ─────────────── */}
        {activeTab === 'outline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Word count & Reading time chips */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ padding: '6px 8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.6rem' }}>WORDS</span>
                <strong style={{ color: 'var(--text-primary)' }}>{wordCount}</strong>
              </div>
              <div style={{ padding: '6px 8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.6rem' }}>READ TIME</span>
                <strong style={{ color: 'var(--text-primary)' }}>~{readTimeMin} MIN</strong>
              </div>
            </div>

            {/* Headings Outline */}
            <div>
              <div style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                DOCUMENT OUTLINE:
              </div>

              {outlineHeadings.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No headings found in document body.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {outlineHeadings.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        paddingLeft: (h.level - 1) * 10,
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-sans)',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      • {h.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
