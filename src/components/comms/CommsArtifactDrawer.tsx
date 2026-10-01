import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  GitBranch,
  HardDrive,
  ShieldCheck,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { TaskNodeData } from '../../types';

export const CommsArtifactDrawer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'nodes' | 'vault' | 'decisions'>('all');

  const navigate = useNavigate();
  const isRightDrawerOpen = useCommsStore((state) => state.isRightDrawerOpen);
  const activeChannelId = useCommsStore((state) => state.activeChannelId);
  const messagesByChannel = useCommsStore((state) => state.messagesByChannel);
  const openRamPreview = useCommsStore((state) => state.openRamPreview);
  const manifests = useVaultStore((state) => state.manifests);

  const blueprintNodes = useBlueprintStore((state) => state.nodes);
  const setSelectedNodeId = useBlueprintStore((state) => state.setSelectedNodeId);
  const setViewMode = useKanbanStore((state) => state.setViewMode);

  if (!isRightDrawerOpen) return null;

  const currentMessages = messagesByChannel[activeChannelId] || [];

  // Extract linked nodes
  const linkedNodeIds = Array.from(
    new Set(
      currentMessages
        .map((m) => m.embeddedBlueprintNodeId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const linkedNodes = linkedNodeIds
    .map((id) => blueprintNodes.find((n) => n.id === id))
    .filter((n): n is TaskNodeData => Boolean(n && n.type === 'task'));

  // Extract shared vault manifests
  const sharedVaultIds = Array.from(
    new Set(
      currentMessages
        .map((m) => m.embeddedVaultManifestId)
        .filter((id): id is string => Boolean(id))
    )
  );

  // Extract sealed decisions
  const sealedBlocks = currentMessages
    .filter((m) => m.isSealed && m.sealLedgerBlock)
    .map((m) => m.sealLedgerBlock!);

  const handleJumpToNode = (nodeId: string) => {
    TactileSoundEngine.playMechanicalTransient();
    setSelectedNodeId(nodeId);
    setViewMode('canvas');
    navigate('/blueprint');
  };

  const handleRamPreviewManifest = (manifestId: string) => {
    TactileSoundEngine.playClick();
    const found = manifests.find((m) => m.manifestId === manifestId);
    openRamPreview({
      fileName: found ? found.originalFileName : `MANIFEST-${manifestId.slice(0, 8)}.bin.enc`,
      fileSize: found ? found.trueByteLength : 0,
      mimeType: found ? found.mimeType : 'application/octet-stream',
      clearance: found ? found.clearanceLevel : 1,
    });
  };

  return (
    <aside
      style={{
        width: 290,
        minWidth: 290,
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-hairline)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={13} style={{ color: 'var(--clr-accent)' }} />
            <span
              style={{
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
              }}
            >
              CHANNEL ARTIFACT INDEX
            </span>
          </div>

          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              padding: '2px 6px',
              borderRadius: 2,
            }}
          >
            {linkedNodes.length + sharedVaultIds.length + sealedBlocks.length} ARTIFACTS
          </span>
        </div>

        {/* Tab Filters */}
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
            { id: 'all', label: 'ALL' },
            { id: 'nodes', label: `NODES (${linkedNodes.length})` },
            { id: 'vault', label: `VAULT (${sharedVaultIds.length})` },
            { id: 'decisions', label: `SEALS (${sealedBlocks.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                TactileSoundEngine.playClick();
                setActiveTab(tab.id as any);
              }}
              style={{
                flex: 1,
                padding: '3px 4px',
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
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Artifact Items Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Linked Blueprint Nodes Section */}
        {(activeTab === 'all' || activeTab === 'nodes') && linkedNodes.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                color: '#60a5fa',
                fontWeight: 600,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <GitBranch size={11} />
              <span>LINKED BLUEPRINT NODES</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {linkedNodes.map((n) => {
                const checklist = n.checklist || [];
                const completed = checklist.filter((c: { completed: boolean }) => c.completed).length;

                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-sans)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: 170,
                        }}
                      >
                        {n.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontFamily: 'var(--font-mono)',
                          color: '#3b82f6',
                        }}
                      >
                        {n.status}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.64rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>TASKS: {completed}/{checklist.length}</span>
                      <button
                        onClick={() => handleJumpToNode(n.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--clr-accent)',
                          cursor: 'pointer',
                          fontSize: '0.64rem',
                        }}
                      >
                        <span>CANVAS</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shared Vault Manifests Section */}
        {(activeTab === 'all' || activeTab === 'vault') && sharedVaultIds.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                color: '#f59e0b',
                fontWeight: 600,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <HardDrive size={11} />
              <span>SHARED VAULT MANIFESTS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sharedVaultIds.map((vId) => (
                <div
                  key={vId}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    {(() => {
                      const found = manifests.find((m) => m.manifestId === vId);
                      const name = found ? found.originalFileName : `MANIFEST-${vId.slice(0, 8)}.bin.enc`;
                      const sizeStr = found ? `${(found.trueByteLength / 1024).toFixed(0)} KB` : '';
                      const clearanceStr = found ? `L${found.clearanceLevel}` : 'L1';
                      return (
                        <>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 170,
                            }}
                          >
                            {name}
                          </span>
                          <span
                            style={{
                              fontSize: '0.6rem',
                              fontFamily: 'var(--font-mono)',
                              color: '#f59e0b',
                            }}
                          >
                            {clearanceStr} {sizeStr && `// ${sizeStr}`}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      AES-256-GCM
                    </span>
                    <button
                      onClick={() => handleRamPreviewManifest(vId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--clr-accent)',
                        cursor: 'pointer',
                        fontSize: '0.64rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <Eye size={10} />
                      <span>PREVIEW</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sealed Decision Blocks Section */}
        {(activeTab === 'all' || activeTab === 'decisions') && sealedBlocks.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                color: '#d4af37',
                fontWeight: 600,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ShieldCheck size={11} />
              <span>SEALED DECISION BLOCKS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sealedBlocks.map((sb, idx) => (
                <div
                  key={`${sb.blockIndex}_${idx}`}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-surface)',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: '#fef3c7',
                      }}
                    >
                      BLOCK #{sb.blockIndex}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6rem',
                        fontFamily: 'var(--font-mono)',
                        color: '#d4af37',
                      }}
                    >
                      LEDGER LOCKED
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.3,
                      marginBottom: 4,
                    }}
                  >
                    {sb.reason}
                  </div>

                  <div
                    style={{
                      fontSize: '0.6rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>BY: {sb.signatory.slice(0, 14)}...</span>
                    <span>{sb.hash.slice(0, 10)}...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {linkedNodes.length === 0 && sharedVaultIds.length === 0 && sealedBlocks.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            NO ARTIFACTS LINKED TO ACTIVE CHANNEL
          </div>
        )}
      </div>
    </aside>
  );
};
