/* ============================================================
   SOVEREIGN-OS — Node Workspace AI Copilot
   Context-aware reasoning engine operating over Blueprint DAG topology.
   One-click presets, real-time streaming, and in-memory PII scrubbing.
   ============================================================ */

import React, { useState } from 'react';
import {
  Sparkles,
  ListChecks,
  FileText,
  AlertOctagon,
  Send,
  Lock,
  RotateCcw,
  ShieldCheck,
  Server,
  Cpu,
} from 'lucide-react';
import { useAiStore } from '../../../stores/useAiStore';
import { DagContextAggregator } from '../../../services/ai/DagContextAggregator';
import { TactileSoundEngine } from '../../../services/audio/TactileSoundEngine';
import { showToast } from '../../Toast';
import type { BlueprintNode, KineticBezierEdgeData } from '../../../types';

interface NodeAiAssistantProps {
  node: BlueprintNode;
  allNodes: BlueprintNode[];
  allEdges: KineticBezierEdgeData[];
  onChecklistGenerated?: (newSubtasks: string[]) => void;
  onBriefGenerated?: (markdownBrief: string) => void;
  onCommitToVault?: (sealedNode: BlueprintNode) => void;
}

export const NodeAiAssistant: React.FC<NodeAiAssistantProps> = ({
  node,
  allNodes,
  allEdges,
  onChecklistGenerated,
  onBriefGenerated,
  onCommitToVault,
}) => {
  const {
    activeProvider,
    configs,
    isStreaming,
    streamedContent,
    streamingError,
    lastRedactionAudit,
    executeStream,
    resetStreamState,
    openConfigModal,
  } = useAiStore();

  const [promptInput, setPromptInput] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const currentConfig = configs[activeProvider];
  const hasKey = !!currentConfig.encryptedKey || activeProvider === 'OLLAMA';

  // Extract topological system prompt from DAG Context Aggregator
  const dagContext = DagContextAggregator.compileDagContext(node.id, allNodes, allEdges);
  const systemPrompt = dagContext?.serializedSystemPrompt || '';

  const handleRunPreset = async (presetType: 'checklist' | 'brief' | 'risk') => {
    if (!hasKey) {
      showToast(`Please configure ${activeProvider} credentials first.`, 'warning');
      openConfigModal();
      return;
    }

    setActivePreset(presetType);
    let prompt = '';

    if (presetType === 'checklist') {
      prompt = `Based on the inspected node "${node.title}" and its upstream constraints, draft exactly 5 concise, concrete operational subtasks. Format as a numbered list (1. to 5.) without conversational filler.`;
    } else if (presetType === 'brief') {
      prompt = `Synthesize a rigorous technical brief for "${node.title}". Detail architectural objectives, prerequisite dependencies, clearance protocols (${node.clearance}), and operational deliverables in structured markdown.`;
    } else if (presetType === 'risk') {
      prompt = `Conduct an operational risk & dependency audit for "${node.title}". Evaluate incoming upstream constraints, blocking factors, and timeline risks across the connected DAG topology. Provide bulleted risk assessments with mitigation recommendations.`;
    }

    try {
      await executeStream({
        prompt,
        systemPrompt,
        provider: activeProvider,
        model: currentConfig.model,
      });
    } catch (err: any) {
      showToast(`AI execution failed: ${err.message}`, 'error');
    }
  };

  const handleCustomSubmit = async () => {
    if (!promptInput.trim()) return;
    if (!hasKey) {
      showToast(`Please configure ${activeProvider} credentials first.`, 'warning');
      openConfigModal();
      return;
    }

    const prompt = promptInput.trim();
    setPromptInput('');
    setActivePreset('custom');

    try {
      await executeStream({
        prompt,
        systemPrompt,
        provider: activeProvider,
        model: currentConfig.model,
      });
    } catch (err: any) {
      showToast(`AI execution failed: ${err.message}`, 'error');
    }
  };

  const handleApplyToChecklist = () => {
    if (!streamedContent) return;
    TactileSoundEngine.playClick();

    // Parse list lines from streamed content
    const lines = streamedContent
      .split('\n')
      .map((l) => l.replace(/^\d+[.)]\s*|-\s*|\[\s*\]\s*/, '').trim())
      .filter((l) => l.length > 0)
      .slice(0, 10);

    if (lines.length > 0 && onChecklistGenerated) {
      onChecklistGenerated(lines);
      TactileSoundEngine.playVaultLock();
      showToast(`Inserted ${lines.length} AI subtasks into node checklist.`, 'success');
    }
  };

  const handleApplyToBrief = () => {
    if (!streamedContent) return;
    TactileSoundEngine.playClick();
    if (onBriefGenerated) {
      onBriefGenerated(streamedContent);
      TactileSoundEngine.playVaultLock();
      showToast('Applied AI brief to node specifications.', 'success');
    }
  };

  const handleCommitToVault = () => {
    if (!streamedContent) return;
    TactileSoundEngine.playLedgerSealThud();

    // Create updated node copy with notes or checklist
    const updatedNode = { ...node, markdownNotes: streamedContent };
    if (onCommitToVault) {
      onCommitToVault(updatedNode);
    }
    showToast('AI reasoning payload envelope-encrypted and sealed to vault.', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {/* Provider & Telemetry Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-2xs)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeProvider === 'OLLAMA' ? (
            <Server size={12} color="var(--clr-accent)" />
          ) : (
            <Cpu size={12} color="var(--clr-accent)" />
          )}
          <span style={{ color: 'var(--text-muted)' }}>PROVIDER:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeProvider}</span>
          <span style={{ color: 'var(--border-moderate)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{currentConfig.model}</span>
        </div>

        <button
          type="button"
          onClick={openConfigModal}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--clr-accent)',
            fontSize: '0.62rem',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {hasKey ? 'Configure Key' : 'Setup Required'}
        </button>
      </div>

      {/* One-Click Presets */}
      <div>
        <span className="label-overline" style={{ display: 'block', marginBottom: 6, fontSize: '0.60rem' }}>
          ONE-CLICK COGNITIVE PRESETS
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)' }}>
          <button
            type="button"
            className={`btn btn-xs ${activePreset === 'checklist' && isStreaming ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleRunPreset('checklist')}
            disabled={isStreaming}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 4px' }}
          >
            <ListChecks size={12} />
            Auto Checklist
          </button>

          <button
            type="button"
            className={`btn btn-xs ${activePreset === 'brief' && isStreaming ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleRunPreset('brief')}
            disabled={isStreaming}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 4px' }}
          >
            <FileText size={12} />
            Synthesize Brief
          </button>

          <button
            type="button"
            className={`btn btn-xs ${activePreset === 'risk' && isStreaming ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleRunPreset('risk')}
            disabled={isStreaming}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 4px' }}
          >
            <AlertOctagon size={12} />
            Risk Audit
          </button>
        </div>
      </div>

      {/* Streaming Output Surface */}
      {(streamedContent || isStreaming || streamingError) && (
        <div
          style={{
            padding: 'var(--sp-3)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-2)',
          }}
        >
          {/* Output Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={12} color="var(--clr-accent)" />
              <span className="label-mono" style={{ fontSize: '0.62rem', color: 'var(--clr-accent)' }}>
                {isStreaming ? 'STREAMING COGNITIVE RESPONSE...' : 'SYNTHESIS COMPLETE'}
              </span>
            </div>

            {lastRedactionAudit && lastRedactionAudit.redactedCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.60rem',
                  color: 'var(--clr-positive)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <ShieldCheck size={11} />
                {lastRedactionAudit.redactedCount} tokens sanitized
              </span>
            )}
          </div>

          {/* Text Container with Blinking Cursor */}
          <div
            style={{
              maxHeight: 240,
              overflowY: 'auto',
              padding: '8px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {streamedContent}
            {isStreaming && (
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 12,
                  background: 'var(--clr-accent)',
                  marginLeft: 3,
                  animation: 'pulse 1s infinite',
                }}
              />
            )}
            {streamingError && (
              <div style={{ color: 'var(--clr-danger)', marginTop: 4 }}>
                {streamingError}
              </div>
            )}
          </div>

          {/* Action Bar on Streamed Content */}
          {!isStreaming && streamedContent && (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginTop: 4 }}>
              {node.type === 'task' && onChecklistGenerated && (
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleApplyToChecklist}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <ListChecks size={12} />
                  Insert Checklist
                </button>
              )}

              {onBriefGenerated && (
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleApplyToBrief}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <FileText size={12} />
                  Apply to Brief
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary btn-xs"
                onClick={handleCommitToVault}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Lock size={12} />
                Commit & Encrypt to Vault
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={resetStreamState}
                style={{ padding: 4 }}
                title="Clear Output"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contextual Custom Prompt Input Bar */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCustomSubmit();
            }
          }}
          disabled={isStreaming}
          placeholder="Ask contextual prompt about this node's branch..."
          style={{
            flex: 1,
            padding: '7px 10px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
          }}
        />

        <button
          type="button"
          className="btn btn-primary btn-xs"
          onClick={handleCustomSubmit}
          disabled={isStreaming || !promptInput.trim()}
          style={{ padding: '0 12px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};
