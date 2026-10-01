import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Edit3,
  Eye,
  Columns,
  Image,
  Bold,
  Italic,
  CheckSquare,
  Table as TableIcon,
  Code,
  Minus,
  AlertCircle,
  Clock,
  Tag,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useDocsStore } from '../../stores/useDocsStore';
import { useAiStore } from '../../stores/useAiStore';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { GfmMarkdownRenderer } from './GfmMarkdownRenderer';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { DocumentCoverStyle, DocumentPublicationStatus } from '../../types';

export const DocEditorCanvas: React.FC = () => {
  const activeDocumentId = useDocsStore((state) => state.activeDocumentId);
  const documents = useDocsStore((state) => state.documents);
  const updateDocumentContent = useDocsStore((state) => state.updateDocumentContent);
  const updateDocumentMetadata = useDocsStore((state) => state.updateDocumentMetadata);
  const isSaving = useDocsStore((state) => state.isSaving);
  const editorMode = useDocsStore((state) => state.editorMode);
  const setEditorMode = useDocsStore((state) => state.setEditorMode);
  const isUtilityDrawerOpen = useDocsStore((state) => state.isUtilityDrawerOpen);
  const toggleUtilityDrawer = useDocsStore((state) => state.toggleUtilityDrawer);

  const { hasPermission, isIntern, isAuditor } = usePermissionStore();
  const canEdit = hasPermission('docs:edit');
  const isReadOnly = !canEdit || isIntern() || isAuditor();
  const effectiveEditorMode = isReadOnly ? 'preview' : editorMode;

  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const doc = documents.find((d) => d.id === activeDocumentId);

  if (!doc) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-muted)',
          gap: 12,
        }}
      >
        <Edit3 size={28} style={{ opacity: 0.3 }} />
        <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
          SELECT OR CREATE A ZERO-KNOWLEDGE DOCUMENT TO BEGIN COMPOSITION
        </span>
      </div>
    );
  }

  const coverGradients: Record<DocumentCoverStyle, string> = {
    'obsidian-mesh': 'linear-gradient(135deg, #050507 0%, #121624 50%, #0a0f1d 100%)',
    'titanium-linear': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    'monastic-amber': 'linear-gradient(135deg, #1c140a 0%, #2e1d0d 50%, #180f05 100%)',
    'cypher-matrix': 'linear-gradient(135deg, #001a08 0%, #002b11 50%, #000a03 100%)',
    'blueprint-grid': 'linear-gradient(135deg, #021226 0%, #05244c 50%, #021226 100%)',
  };

  const handleInsertFormatting = (prefix: string, suffix = '') => {
    TactileSoundEngine.playClick();
    const newContent = `${doc.content}\n${prefix}${suffix}`;
    updateDocumentContent(doc.id, newContent);
  };

  // Inline BYO-AI Copilot Actions
  const handleAiAction = async (promptType: 'summarize' | 'checklist' | 'polish') => {
    TactileSoundEngine.playClick();
    setIsAiGenerating(true);

    const prompts = {
      summarize: `Summarize the following technical document in 3 concise executive bullet points:\n\n${doc.content}`,
      checklist: `Generate 4 actionable verification checklist items (- [ ]) based on this document:\n\n${doc.content}`,
      polish: `Polish the following document prose to be institutional, razor-sharp, and authoritative:\n\n${doc.content.slice(0, 800)}`,
    };

    try {
      const aiStore = useAiStore.getState();
      const activeProvider = aiStore.activeProvider;
      const key = aiStore.inMemoryKeys[activeProvider];

      if (key || activeProvider === 'OLLAMA') {
        const response = await aiStore.executeStream({
          prompt: prompts[promptType],
          temperature: 0.2,
          maxTokens: 512,
        });

        TactileSoundEngine.playAiCompletionChime();
        const updated = `${doc.content}\n\n## AI Copilot Synthesis (${promptType.toUpperCase()})\n${response}\n`;
        updateDocumentContent(doc.id, updated);
        showToast(`AI Copilot output inserted into document.`, 'success');
      } else {
        // Fallback offline deterministic copilot generator
        const offlineOutputs = {
          summarize: `\n\n> [!NOTE]\n> **Executive Synthesis**:\n> - Cryptographic enclave verified with zero plaintext persistence.\n> - Field-level envelope encryption (AES-256-GCM) active.\n> - Strategic milestones aligned with Treasury Reserve thresholds.\n`,
          checklist: `\n\n### Actionable Verification Checklist\n- [ ] Audit WebAssembly linear memory bounds\n- [ ] Verify SHA-256 genesis block hash\n- [ ] Ratify policy with dual-signatory founder approval\n- [ ] Seal ratification record into Treasury Ledger\n`,
          polish: `\n\n> [!TIP]\n> **Institutional Policy Note**: Operating procedures formalized under zero-knowledge mandate. All state updates are signed and bound to enclave runtime.\n`,
        };

        const updated = `${doc.content}${offlineOutputs[promptType]}`;
        updateDocumentContent(doc.id, updated);
        showToast(`Offline Copilot template appended. Configure AI Provider in Settings for live model streaming.`, 'info');
      }
    } catch (err) {
      console.warn('[DOC_COPILOT] Error executing AI stream:', err);
      showToast('AI Copilot encountered an error.', 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <main
      style={{
        flex: 1,
        height: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Top Bar: Title, Status, Auto-Save Status, Editor Controls ── */}
      <div
        style={{
          height: 48,
          minHeight: 48,
          paddingInline: 14,
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {/* Clearance Badge */}
          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {doc.clearance}
          </span>

          {/* Status Dropdown */}
          <select
            disabled={isReadOnly}
            value={doc.status}
            onChange={(e) =>
              updateDocumentMetadata(doc.id, {
                status: e.target.value as DocumentPublicationStatus,
              })
            }
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: isReadOnly ? 'var(--text-muted)' : 'var(--text-secondary)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              outline: 'none',
              cursor: isReadOnly ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="draft">Draft</option>
            <option value="in-review">In Review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          {/* Auto-Save Debounce Indicator / Read-Only Badge */}
          {isReadOnly ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--clr-caution)',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '2px 6px',
                borderRadius: 3,
                border: '1px solid rgba(245, 158, 11, 0.25)',
              }}
            >
              <Lock size={10} />
              <span>SALT-OKUNUR GÖZLEM MODU</span>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.62rem',
                fontFamily: 'var(--font-mono)',
                color: isSaving ? '#f59e0b' : '#10b981',
              }}
            >
              <Lock size={10} />
              <span>
                {isSaving ? 'ENCRYPTING (AES-256-GCM)...' : 'SAVED TO ZK ENVELOPE'}
              </span>
            </div>
          )}
        </div>

        {/* Right Tools: View Mode Toggle & Utility Drawer Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Mode Switcher */}
          {!isReadOnly ? (
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
                { id: 'edit', icon: <Edit3 size={11} />, label: 'EDIT' },
                { id: 'split', icon: <Columns size={11} />, label: 'SPLIT' },
                { id: 'preview', icon: <Eye size={11} />, label: 'PREVIEW' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setEditorMode(m.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 7px',
                    borderRadius: 2,
                    fontSize: '0.64rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: editorMode === m.id ? 600 : 400,
                    color: editorMode === m.id ? 'var(--clr-accent)' : 'var(--text-muted)',
                    background: editorMode === m.id ? 'var(--bg-secondary)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--clr-warning)',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
              }}
            >
              <Eye size={11} />
              <span>PREVIEW ONLY</span>
            </div>
          )}

          {/* Toggle Utility Drawer */}
          <button
            onClick={toggleUtilityDrawer}
            title={isUtilityDrawerOpen ? 'Collapse Utility Drawer' : 'Expand Utility Drawer'}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            {isUtilityDrawerOpen ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
          </button>
        </div>
      </div>

      {/* ── Scrollable Document Body ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Custom Document Cover Banner */}
        <div
          style={{
            height: 110,
            width: '100%',
            background: coverGradients[doc.coverStyle || 'obsidian-mesh'],
            position: 'relative',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '12px 24px',
            flexShrink: 0,
          }}
        >
          {/* Change Cover Button */}
          {!isReadOnly && (
            <button
              onClick={() => setShowCoverPicker(!showCoverPicker)}
              style={{
                position: 'absolute',
                top: 10,
                right: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                fontSize: '0.64rem',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              <Image size={10} />
              <span>CHANGE COVER</span>
            </button>
          )}

          {/* Cover Picker Popover */}
          {!isReadOnly && showCoverPicker && (
            <div
              style={{
                position: 'absolute',
                top: 36,
                right: 14,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
                padding: 6,
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {[
                { id: 'obsidian-mesh', label: 'Obsidian Mesh' },
                { id: 'titanium-linear', label: 'Titanium Linear' },
                { id: 'monastic-amber', label: 'Monastic Amber' },
                { id: 'cypher-matrix', label: 'Cypher Matrix' },
                { id: 'blueprint-grid', label: 'Blueprint Grid' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    updateDocumentMetadata(doc.id, { coverStyle: c.id as DocumentCoverStyle });
                    setShowCoverPicker(false);
                  }}
                  style={{
                    background: doc.coverStyle === c.id ? 'var(--bg-secondary)' : 'transparent',
                    border: 'none',
                    color: doc.coverStyle === c.id ? 'var(--clr-accent)' : 'var(--text-secondary)',
                    padding: '4px 8px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'left',
                    borderRadius: 2,
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Document Title Header over Cover */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Sealed Metallic Badge */}
            {doc.isSealed && doc.sealLedgerBlock && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.3) 0%, rgba(212, 175, 55, 0.1) 100%)',
                  border: '1px solid #d4af37',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.64rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#fef3c7',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <ShieldCheck size={12} style={{ color: '#fbbf24' }} />
                <span>SEALED TO TREASURY LEDGER // BLOCK #{doc.sealLedgerBlock.blockIndex}</span>
              </div>
            )}
          </div>
        </div>

        {/* Document Content Workspace */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 24px',
            maxWidth: 1100,
            width: '100%',
            margin: '0 auto',
          }}
        >
          {/* Editorial Title Input */}
          <input
            type="text"
            value={doc.title}
            disabled={isReadOnly}
            onChange={(e) => updateDocumentMetadata(doc.id, { title: e.target.value })}
            placeholder="Document Title..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 10,
              cursor: isReadOnly ? 'default' : 'text',
            }}
          />

          {/* Metadata Chips Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border-hairline)',
              flexWrap: 'wrap',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>AUTHOR:</span>
              <strong style={{ color: 'var(--text-secondary)' }}>{doc.authorAlias}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              <span>UPDATED: {new Date(doc.updatedAt).toLocaleDateString()}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Tag size={11} />
              <span>{doc.tags.join(', ')}</span>
            </div>
          </div>

          {/* Markdown Formatting & Copilot Toolbar */}
          {!isReadOnly && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                padding: '4px 8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {/* Formatting shortcuts */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {[
                  { label: 'H1', action: () => handleInsertFormatting('# ') },
                  { label: 'H2', action: () => handleInsertFormatting('## ') },
                  { label: 'H3', action: () => handleInsertFormatting('### ') },
                  { icon: <Bold size={11} />, action: () => handleInsertFormatting('**Bold Text**') },
                  { icon: <Italic size={11} />, action: () => handleInsertFormatting('*Italic Text*') },
                  { icon: <CheckSquare size={11} />, action: () => handleInsertFormatting('- [ ] Actionable Task Item') },
                  { icon: <TableIcon size={11} />, action: () => handleInsertFormatting('| Key | Description | Status |\n|:---|:---|:---|\n| Alpha | Core Security Layer | Active |') },
                  { icon: <AlertCircle size={11} />, action: () => handleInsertFormatting('> [!NOTE]\n> Enclave invariant details here.\n') },
                  { icon: <Code size={11} />, action: () => handleInsertFormatting('```typescript\nconst secret = "AES-256-GCM";\n```') },
                  { icon: <Minus size={11} />, action: () => handleInsertFormatting('---') },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '3px 6px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 2,
                      color: 'var(--text-muted)',
                      fontSize: '0.68rem',
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    {btn.icon || btn.label}
                  </button>
                ))}
              </div>

              {/* Inline AI Copilot Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--clr-accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Sparkles size={11} />
                  <span>AI COPILOT:</span>
                </span>

                <button
                  onClick={() => handleAiAction('summarize')}
                  disabled={isAiGenerating}
                  style={{
                    padding: '2px 6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 2,
                    color: 'var(--text-secondary)',
                    fontSize: '0.64rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: isAiGenerating ? 'not-allowed' : 'pointer',
                  }}
                >
                  SUMMARIZE
                </button>

                <button
                  onClick={() => handleAiAction('checklist')}
                  disabled={isAiGenerating}
                  style={{
                    padding: '2px 6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 2,
                    color: 'var(--text-secondary)',
                    fontSize: '0.64rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: isAiGenerating ? 'not-allowed' : 'pointer',
                  }}
                >
                  + CHECKLIST
                </button>

                <button
                  onClick={() => handleAiAction('polish')}
                  disabled={isAiGenerating}
                  style={{
                    padding: '2px 6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 2,
                    color: 'var(--text-secondary)',
                    fontSize: '0.64rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: isAiGenerating ? 'not-allowed' : 'pointer',
                  }}
                >
                  POLISH
                </button>
              </div>
            </div>
          )}

          {/* Unified Editor / Live Preview Container */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns:
                effectiveEditorMode === 'split' ? '1fr 1fr' : '1fr',
              gap: 16,
              minHeight: 400,
            }}
          >
            {/* Raw Markdown Editor Pane */}
            {(effectiveEditorMode === 'edit' || effectiveEditorMode === 'split') && (
              <textarea
                value={doc.content}
                onChange={(e) => updateDocumentContent(doc.id, e.target.value)}
                placeholder="Compose zero-knowledge Markdown..."
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 400,
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 14,
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                }}
              />
            )}

            {/* Live GFM Preview Pane */}
            {(effectiveEditorMode === 'preview' || effectiveEditorMode === 'split') && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 400,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 16,
                  overflowY: 'auto',
                }}
              >
                <GfmMarkdownRenderer
                  content={doc.content}
                  onContentChange={(newContent) => !isReadOnly && updateDocumentContent(doc.id, newContent)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
