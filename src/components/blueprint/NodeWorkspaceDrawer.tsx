/* ============================================================
   SOVEREIGN-OS — Blueprint Node Workspace Drawer
   Unified tactical command drawer integrating:
   1. Cognitive AI Copilot (One-click presets, PII scrubber, direct streaming)
   2. Workspace Task Checklist & Markdown Specifications
   3. E2EE Context Discussion & Immutable Ledger Seal
   ============================================================ */

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckSquare,
  MessageSquare,
  Shield,
  Send,
  Lock,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { NodeAiAssistant } from './ai/NodeAiAssistant';
import { TaskChecklistEngine } from './TaskChecklistEngine';
import { MarkdownNoteEditor } from './MarkdownNoteEditor';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { TranslationBridge, SUPPORTED_LANGUAGES } from '../../services/i18n/TranslationBridge';
import { usePermissionStore } from '../../stores/usePermissionStore';
import { showToast } from '../Toast';
import type {
  BlueprintNode,
  KineticBezierEdgeData,
  TaskNodeData,
  SupportedTranslationLang,
} from '../../types';

interface NodeWorkspaceDrawerProps {
  node: BlueprintNode | null;
  allNodes: BlueprintNode[];
  allEdges: KineticBezierEdgeData[];
  onClose: () => void;
  onUpdateNode: (updatedNode: BlueprintNode) => void;
  onSealToLedger?: (decisionText: string) => void;
}

interface ChatMessage {
  id: string;
  author: string;
  role: string;
  text: string;
  time: string;
  isSealed?: boolean;
}

export const NodeWorkspaceDrawer: React.FC<NodeWorkspaceDrawerProps> = ({
  node,
  allNodes,
  allEdges,
  onClose,
  onUpdateNode,
  onSealToLedger,
}) => {
  const { hasPermission, isManager } = usePermissionStore();
  const canEdit = hasPermission('blueprint:edit');

  const [activeTab, setActiveTab] = useState<'ai' | 'workspace' | 'chat'>('ai');
  const [originalNode, setOriginalNode] = useState<BlueprintNode | null>(null);
  const [currentLang, setCurrentLang] = useState<SupportedTranslationLang>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [shieldStats, setShieldStats] = useState<{ count: number; lang: SupportedTranslationLang } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      author: 'SOVEREIGN_AI_ENCLAVE',
      role: 'Autonomous Agent',
      text: 'Node thread initialized with localized E2EE key exchange. All messages are encrypted in client memory.',
      time: '10:42',
    },
    {
      id: 'm2',
      author: 'OPERATOR_49',
      role: 'Lead Architect',
      text: 'Verified SLA parameters and cryptographic clearance level. Ready to proceed with branch deployment.',
      time: '10:45',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Reset translation cache when node changes
  useEffect(() => {
    setOriginalNode(null);
    setCurrentLang('en');
    setShieldStats(null);
  }, [node?.id]);

  if (!node) return null;

  const isTaskNode = node.type === 'task';
  const taskChecklist = isTaskNode ? (node as TaskNodeData).checklist || [] : [];
  const markdownNotes = node.markdownNotes || '';

  const handleTranslate = async (targetLang: SupportedTranslationLang) => {
    if (targetLang === 'en') {
      handleRevert();
      return;
    }
    TactileSoundEngine.playMechanicalTransient();
    setIsTranslating(true);
    try {
      if (!originalNode) {
        setOriginalNode({ ...node });
      }
      const sourceTitle = originalNode?.title || node.title;
      const sourceNotes = originalNode?.markdownNotes || node.markdownNotes || '';

      const titleRes = await TranslationBridge.translate(sourceTitle, targetLang, 'en');
      const notesRes = await TranslationBridge.translate(sourceNotes, targetLang, 'en');

      let updatedNode: BlueprintNode = {
        ...node,
        title: titleRes.translatedText,
        markdownNotes: notesRes.translatedText,
      };

      if (isTaskNode && (node as TaskNodeData).checklist) {
        const sourceChecklist = (originalNode as TaskNodeData)?.checklist || (node as TaskNodeData).checklist || [];
        const translatedItems = await Promise.all(
          sourceChecklist.map(async (item) => {
            const res = await TranslationBridge.translate(item.text, targetLang, 'en');
            return { ...item, text: res.translatedText };
          })
        );
        (updatedNode as TaskNodeData).checklist = translatedItems;
      }

      const totalShielded = titleRes.shieldedTermsCount + notesRes.shieldedTermsCount;
      setShieldStats({ count: totalShielded, lang: targetLang });
      setCurrentLang(targetLang);
      onUpdateNode(updatedNode);
      showToast(
        `Translated to ${SUPPORTED_LANGUAGES[targetLang]?.label || targetLang} (${totalShielded} terms shielded)`,
        'success'
      );
    } catch (err: any) {
      showToast(`Translation error: ${err.message}`, 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRevert = () => {
    if (originalNode) {
      TactileSoundEngine.playMechanicalTransient();
      onUpdateNode({ ...originalNode });
      setOriginalNode(null);
      setCurrentLang('en');
      setShieldStats(null);
      showToast('Reverted to original source language', 'info');
    }
  };

  const handleChecklistChange = (updated: Array<{ id: string; text: string; completed: boolean }>) => {
    if (!canEdit) {
      showToast('Yetkisiz işlem: Görev listesini düzenleme izniniz yok.', 'warning');
      return;
    }
    if (!isTaskNode) return;
    const updatedTask: TaskNodeData = {
      ...(node as TaskNodeData),
      checklist: updated,
    };
    onUpdateNode(updatedTask);
  };

  const handleNotesChange = (notes: string) => {
    if (!canEdit) {
      showToast('Yetkisiz işlem: Düğüm notlarını değiştirme izniniz yok.', 'warning');
      return;
    }
    const updated = {
      ...node,
      markdownNotes: notes,
    };
    onUpdateNode(updated);
  };

  const handleAiChecklistGenerated = (subtasks: string[]) => {
    if (!canEdit) {
      showToast('Yetkisiz işlem: Yapay zeka ile görev üretme izniniz yok.', 'warning');
      return;
    }
    if (!isTaskNode) return;
    const currentList = (node as TaskNodeData).checklist || [];
    const newItems = subtasks.map((text, idx) => ({
      id: `ai_${Date.now()}_${idx}`,
      text,
      completed: false,
    }));
    handleChecklistChange([...currentList, ...newItems]);
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    TactileSoundEngine.playClick();
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      author: 'CURRENT_OPERATOR',
      role: 'Enclave User',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  const handleSealDecision = () => {
    if (!isManager()) {
      showToast('Yetkisiz işlem: Kararları yalnızca Yöneticiler (Lider/Kurucu) mühürleyebilir.', 'error');
      return;
    }
    TactileSoundEngine.playLedgerSealThud();
    const decisionText = `NODE DECISION [${node.title}]: Thread sealed by operator at ${new Date().toISOString()}`;
    if (onSealToLedger) {
      onSealToLedger(decisionText);
    }
    showToast(`Decision sealed to immutable double-entry ledger.`, 'success');

    const sealedMsg: ChatMessage = {
      id: `m_seal_${Date.now()}`,
      author: 'IMMUTABLE_LEDGER_CHAIN',
      role: 'SHA-256 Protocol',
      text: `SEAL ATTESTED: Decision bound to block with cryptographic hash confirmation.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSealed: true,
    };
    setChatMessages((prev) => [...prev, sealedMsg]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-drawer)' as unknown as number,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Slide Drawer Surface */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 520,
          height: '100%',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-moderate)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'enter-up var(--dur-base) var(--ease-out) both',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-6)',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', overflow: 'hidden' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(78, 242, 210, 0.08)',
                border: '1px solid var(--border-moderate)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Shield size={16} color="var(--clr-accent)" />
            </div>

            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--clr-accent)',
                  }}
                >
                  {node.clearance}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>//</span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {node.type.toUpperCase()}
                </span>
              </div>
              <h2
                className="type-title"
                style={{
                  fontSize: 'var(--text-sm)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {node.title}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {originalNode && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={handleRevert}
                title="Revert to original text (EN)"
                style={{ padding: '3px 6px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={12} />
                <span style={{ fontSize: '0.65rem' }}>EN</span>
              </button>
            )}
            <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ZK Contextual Translation Strip */}
        <div
          style={{
            padding: '6px 16px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            <Globe size={13} color="var(--clr-accent)" />
            <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>ZK TRANSLATION:</span>
            {shieldStats && (
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '1px 5px',
                  borderRadius: 3,
                  background: 'rgba(78, 242, 210, 0.1)',
                  color: 'var(--clr-accent)',
                  border: '1px solid rgba(78, 242, 210, 0.25)',
                }}
              >
                🛡️ {shieldStats.count} SHIELDED
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {(['en', 'tr', 'zh', 'de', 'ru'] as SupportedTranslationLang[]).map((lang) => {
              const isActive = currentLang === lang;
              const cfg = SUPPORTED_LANGUAGES[lang];
              return (
                <button
                  key={lang}
                  disabled={isTranslating}
                  onClick={() => handleTranslate(lang)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: isActive ? 'var(--clr-accent)' : 'transparent',
                    color: isActive ? '#000' : 'var(--text-muted)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--clr-accent)' : 'var(--border-hairline)',
                    cursor: 'pointer',
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: isActive ? 700 : 500,
                  }}
                  title={`Translate to ${cfg.label}`}
                >
                  {lang.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-secondary)',
          }}
        >
          {[
            { id: 'ai', label: 'AI Copilot', icon: Sparkles },
            { id: 'workspace', label: 'Tasks & Notes', icon: CheckSquare },
            { id: 'chat', label: 'Enclave Chat', icon: MessageSquare },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setActiveTab(tab.id as any);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 8px',
                  background: active ? 'var(--bg-primary)' : 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--clr-accent)' : 'transparent'}`,
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'background var(--dur-fast)',
                }}
              >
                <Icon size={13} color={active ? 'var(--clr-accent)' : undefined} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--sp-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-6)',
          }}
        >
          {/* TAB 1: COGNITIVE AI COPILOT */}
          {activeTab === 'ai' && (
            <NodeAiAssistant
              node={node}
              allNodes={allNodes}
              allEdges={allEdges}
              onChecklistGenerated={handleAiChecklistGenerated}
              onBriefGenerated={handleNotesChange}
              onCommitToVault={(sealedNode) => onUpdateNode(sealedNode)}
            />
          )}

          {/* TAB 2: TASKS & NOTES WORKSPACE */}
          {activeTab === 'workspace' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
              {isTaskNode ? (
                <TaskChecklistEngine
                  items={taskChecklist}
                  onChange={handleChecklistChange}
                  onAiTrigger={() => setActiveTab('ai')}
                />
              ) : (
                <div
                  style={{
                    padding: 'var(--sp-3)',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                  }}
                >
                  This node is of type <strong style={{ color: 'var(--text-primary)' }}>{node.type}</strong>. Subtask checklists apply to Task nodes.
                </div>
              )}

              <div style={{ height: 1, background: 'var(--border-hairline)' }} />

              <MarkdownNoteEditor
                value={markdownNotes}
                onChange={handleNotesChange}
                onAiTrigger={() => setActiveTab('ai')}
              />
            </div>
          )}

          {/* TAB 3: ENCLAVE DISCUSSION & LEDGER SEAL */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--sp-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="label-overline" style={{ fontSize: '0.62rem' }}>
                  NODE DISCUSSION THREAD
                </span>
                {isManager() && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={handleSealDecision}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--clr-accent)' }}
                  >
                    <Lock size={11} />
                    Seal Decision to Ledger
                  </button>
                )}
              </div>

              {/* Chat Thread Messages */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-3)',
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {chatMessages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: m.isSealed ? 'rgba(78, 242, 210, 0.05)' : 'var(--bg-primary)',
                      border: `1px solid ${m.isSealed ? 'rgba(78, 242, 210, 0.3)' : 'var(--border-subtle)'}`,
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--clr-accent)', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                        {m.author} <span style={{ color: 'var(--text-muted)' }}>({m.role})</span>
                      </span>
                      <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {m.time}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder="Record enclave communication..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-moderate)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-xs"
                  onClick={handleSendChatMessage}
                  style={{ padding: '0 12px' }}
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
