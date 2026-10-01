/* ============================================================
   SOVEREIGN-OS — BYO-AI Provider Configuration Modal
   Hardware-isolated model key management, direct-to-provider testing,
   custom corporate PII masking tags, and temperature controls.
   ============================================================ */

import React, { useState } from 'react';
import {
  X,
  Bot,
  Shield,
  Zap,
  Lock,
  Trash2,
  CheckCircle2,
  Server,
  Plus,
  Eye,
  EyeOff,
  Cpu,
} from 'lucide-react';
import { useAiStore } from '../../stores/useAiStore';
import { LocalPiiRedactor } from '../../services/ai/LocalPiiRedactor';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { AiProvider, AiModelDescriptor } from '../../types';

const PROVIDER_MODELS: Record<AiProvider, AiModelDescriptor[]> = {
  GEMINI: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Deep Reasoning)', provider: 'GEMINI', contextWindow: '2M tokens', defaultTemperature: 0.7 },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Sub-Second Latency)', provider: 'GEMINI', contextWindow: '1M tokens', defaultTemperature: 0.7 },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'GEMINI', contextWindow: '2M tokens', defaultTemperature: 0.7 },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'GEMINI', contextWindow: '1M tokens', defaultTemperature: 0.7 },
  ],
  CLAUDE: [
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Frontier Coding)', provider: 'CLAUDE', contextWindow: '200k tokens', defaultTemperature: 0.7 },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (High Throughput)', provider: 'CLAUDE', contextWindow: '200k tokens', defaultTemperature: 0.7 },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'CLAUDE', contextWindow: '200k tokens', defaultTemperature: 0.7 },
  ],
  OPENAI: [
    { id: 'gpt-4o', label: 'GPT-4o Omnimodel', provider: 'OPENAI', contextWindow: '128k tokens', defaultTemperature: 0.7 },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Efficiency)', provider: 'OPENAI', contextWindow: '128k tokens', defaultTemperature: 0.7 },
    { id: 'o1-preview', label: 'OpenAI o1 Reasoning', provider: 'OPENAI', contextWindow: '128k tokens', defaultTemperature: 1.0 },
    { id: 'o1-mini', label: 'OpenAI o1-mini', provider: 'OPENAI', contextWindow: '128k tokens', defaultTemperature: 1.0 },
  ],
  OLLAMA: [
    { id: 'llama3.3:latest', label: 'Llama 3.3 70B (Local Enclave)', provider: 'OLLAMA', contextWindow: '128k tokens', defaultTemperature: 0.7, isLocal: true },
    { id: 'llama3.2:latest', label: 'Llama 3.2 3B/1B (Edge Runtime)', provider: 'OLLAMA', contextWindow: '128k tokens', defaultTemperature: 0.7, isLocal: true },
    { id: 'qwen2.5:latest', label: 'Qwen 2.5 Coder', provider: 'OLLAMA', contextWindow: '128k tokens', defaultTemperature: 0.7, isLocal: true },
    { id: 'deepseek-r1:latest', label: 'DeepSeek R1 Distill', provider: 'OLLAMA', contextWindow: '64k tokens', defaultTemperature: 0.6, isLocal: true },
    { id: 'mistral:latest', label: 'Mistral 7B', provider: 'OLLAMA', contextWindow: '32k tokens', defaultTemperature: 0.7, isLocal: true },
  ],
};

export const ByoAiConfigModal: React.FC = () => {
  const {
    activeProvider,
    configs,
    inMemoryKeys,
    isConfigModalOpen,
    closeConfigModal,
    setActiveProvider,
    saveProviderConfig,
    purgeProvider,
    testProviderConnection,
    addCustomKeyword,
    removeCustomKeyword,
    toggleAggressivePii,
  } = useAiStore();

  const [inputKey, setInputKey] = useState('');
  const [showRawKey, setShowRawKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [customKeywordInput, setCustomKeywordInput] = useState('');
  const [samplePiiTestText, setSamplePiiTestText] = useState('Contact executive John Doe at john@corp.internal or 192.168.1.104 for Project Aegis deployment.');

  if (!isConfigModalOpen) return null;

  const currentConfig = configs[activeProvider];
  const hasSavedKey = !!currentConfig.encryptedKey;
  const currentInMemoryKey = inMemoryKeys[activeProvider];

  const handleProviderSelect = (p: AiProvider) => {
    setActiveProvider(p);
    setInputKey('');
    setShowRawKey(false);
  };

  const handleSave = async () => {
    try {
      TactileSoundEngine.playClick();
      await saveProviderConfig(activeProvider, inputKey || null, currentConfig);
      setInputKey('');
      TactileSoundEngine.playVaultLock();
      showToast(`${activeProvider} credentials sealed to client-side enclave vault.`, 'success');
    } catch (err: any) {
      showToast(`Failed to seal credentials: ${err.message}`, 'error');
    }
  };

  const handlePurge = async () => {
    try {
      TactileSoundEngine.playClick();
      await purgeProvider(activeProvider);
      setInputKey('');
      TactileSoundEngine.playLedgerSealThud();
      showToast(`${activeProvider} credentials completely purged and zeroized from RAM.`, 'info');
    } catch (err: any) {
      showToast(`Failed to purge credentials: ${err.message}`, 'error');
    }
  };

  const handleTestLatency = async () => {
    setIsTesting(true);
    TactileSoundEngine.playClick();
    try {
      const latency = await testProviderConnection(activeProvider);
      showToast(`Direct connection verified: ${latency}ms latency round-trip.`, 'success');
    } catch (err: any) {
      showToast(`Connection test failed: ${err.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddKeyword = () => {
    if (!customKeywordInput.trim()) return;
    addCustomKeyword(customKeywordInput.trim());
    setCustomKeywordInput('');
    TactileSoundEngine.playClick();
  };

  const liveSanitizationPreview = LocalPiiRedactor.sanitizePrompt(samplePiiTestText, {
    aggressive: currentConfig.aggressivePiiRedaction,
    customKeywords: currentConfig.customKeywords,
  });

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
        padding: 'var(--sp-4)',
      }}
    >
      {/* Scrim */}
      <div
        onClick={closeConfigModal}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal Surface */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--sp-4) var(--sp-6)',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(78, 242, 210, 0.08)',
                border: '1px solid rgba(78, 242, 210, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={18} color="var(--clr-accent)" />
            </div>
            <div>
              <span className="label-overline" style={{ fontSize: '0.62rem' }}>
                ZERO-KNOWLEDGE DIRECT-TO-PROVIDER
              </span>
              <h2 className="type-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
                BYO-AI Client Key Registry & PII Scrubber
              </h2>
            </div>
          </div>

          <button className="btn btn-ghost btn-xs" onClick={closeConfigModal} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Provider Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-secondary)',
          }}
        >
          {(['GEMINI', 'CLAUDE', 'OPENAI', 'OLLAMA'] as AiProvider[]).map((p) => {
            const active = activeProvider === p;
            const hasKey = !!configs[p].encryptedKey;
            const isLocal = p === 'OLLAMA';

            return (
              <button
                key={p}
                type="button"
                onClick={() => handleProviderSelect(p)}
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
                {isLocal ? <Server size={13} /> : <Cpu size={13} />}
                <span>{p}</span>
                {hasKey && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--clr-positive)',
                    }}
                    title="Key Sealed in Local Enclave"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: 'var(--sp-6)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-5)',
          }}
        >
          {/* Direct Transit Invariant Banner */}
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 'var(--text-xs)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color="var(--clr-accent)" />
              <span style={{ color: 'var(--text-secondary)' }}>
                {activeProvider === 'OLLAMA'
                  ? 'Air-Gapped Sovereign Mode: Outbound requests dispatch strictly to local/LAN endpoint.'
                  : 'Zero-Proxy Transit: Prompts dispatch directly from browser runtime to model API with zero VDS server logging.'}
              </span>
            </div>
            {currentConfig.status === 'connected' && currentConfig.lastTestedLatencyMs && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  color: 'var(--clr-positive)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCircle2 size={12} />
                {currentConfig.lastTestedLatencyMs}ms
              </span>
            )}
          </div>

          {/* Model Selector & Temperature */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-4)' }}>
            <div>
              <label className="label-overline" style={{ display: 'block', marginBottom: 6 }}>
                Target Model
              </label>
              <select
                value={currentConfig.model}
                onChange={(e) =>
                  saveProviderConfig(activeProvider, null, {
                    ...currentConfig,
                    model: e.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {PROVIDER_MODELS[activeProvider].map((m) => (
                  <option key={m.id} value={m.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {m.label} ({m.contextWindow})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label-overline">Temperature</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--clr-accent)' }}>
                  {currentConfig.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={currentConfig.temperature}
                onChange={(e) =>
                  saveProviderConfig(activeProvider, null, {
                    ...currentConfig,
                    temperature: parseFloat(e.target.value),
                  })
                }
                style={{ width: '100%', accentColor: 'var(--clr-accent)', cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Custom Endpoint URL (for Ollama or custom proxies) */}
          {(activeProvider === 'OLLAMA' || activeProvider === 'OPENAI') && (
            <div>
              <label className="label-overline" style={{ display: 'block', marginBottom: 6 }}>
                {activeProvider === 'OLLAMA' ? 'Local Ollama Endpoint' : 'Custom Base URL (Optional OpenAI Proxy / vLLM)'}
              </label>
              <input
                type="text"
                value={currentConfig.customEndpoint || ''}
                placeholder={activeProvider === 'OLLAMA' ? 'http://localhost:11434' : 'https://api.openai.com/v1'}
                onChange={(e) =>
                  saveProviderConfig(activeProvider, null, {
                    ...currentConfig,
                    customEndpoint: e.target.value,
                  })
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-xs)',
                }}
              />
            </div>
          )}

          {/* API Key Input */}
          {activeProvider !== 'OLLAMA' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label className="label-overline">
                  {activeProvider} API Key
                </label>
                {hasSavedKey && (
                  <span style={{ fontSize: '0.62rem', color: 'var(--clr-positive)', fontFamily: 'var(--font-mono)' }}>
                    SEALED AT REST VIA MASTER KEK
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={showRawKey ? 'text' : 'password'}
                    value={inputKey || (hasSavedKey && !inputKey ? currentInMemoryKey || '••••••••••••••••••••••••••••••••' : '')}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder={hasSavedKey ? 'Key sealed. Enter new key to rotate...' : `Paste ${activeProvider} API key...`}
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-moderate)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xs)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRawKey(!showRawKey)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    {showRawKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleTestLatency}
                  disabled={isTesting || (!hasSavedKey && !inputKey)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 120 }}
                >
                  <Zap size={12} color="var(--clr-accent)" />
                  {isTesting ? 'Pinging...' : 'Test Probe'}
                </button>
              </div>
            </div>
          )}

          {/* In-Memory PII & Entity Redaction Controls */}
          <div
            style={{
              padding: 'var(--sp-4)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="type-title" style={{ fontSize: 'var(--text-xs)' }}>
                  In-Memory PII & Entity Redaction Layer
                </span>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Scrubs emails, IP subnets, hashes, and financial IDs before prompts exit the browser.
                </p>
              </div>

              <button
                type="button"
                className={`btn btn-xs ${currentConfig.aggressivePiiRedaction ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  TactileSoundEngine.playClick();
                  toggleAggressivePii();
                }}
                style={{ fontSize: '0.62rem' }}
              >
                {currentConfig.aggressivePiiRedaction ? 'AGGRESSIVE REDACTION ACTIVE' : 'STANDARD REDACTION'}
              </button>
            </div>

            {/* Custom Corporate Keywords Tag Input */}
            <div>
              <label className="label-overline" style={{ display: 'block', marginBottom: 4, fontSize: '0.60rem' }}>
                Corporate Codenames & Masked Keywords (Replaced with NATO/Greek Pseudonyms)
              </label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  type="text"
                  value={customKeywordInput}
                  onChange={(e) => setCustomKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="Add proprietary keyword (e.g., Project Aegis, Confidential Alpha)..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-moderate)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)',
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleAddKeyword}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Plus size={12} />
                  Add Tag
                </button>
              </div>

              {/* Tag Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {currentConfig.customKeywords && currentConfig.customKeywords.length > 0 ? (
                  currentConfig.customKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 8px',
                        background: 'rgba(78, 242, 210, 0.08)',
                        border: '1px solid rgba(78, 242, 210, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--clr-accent)',
                      }}
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => {
                          TactileSoundEngine.playClick();
                          removeCustomKeyword(kw);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    No custom keywords defined. Standard entities will be sanitized automatically.
                  </span>
                )}
              </div>
            </div>

            {/* Live Interactive Scrubber Preview */}
            <div
              style={{
                marginTop: 'var(--sp-2)',
                padding: '8px 10px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="label-overline" style={{ fontSize: '0.58rem' }}>
                  Live Scrubber Demonstration
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--clr-accent)', fontFamily: 'var(--font-mono)' }}>
                  {liveSanitizationPreview.redactedCount} tokens masked
                </span>
              </div>
              <input
                type="text"
                value={samplePiiTestText}
                onChange={(e) => setSamplePiiTestText(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px dashed var(--border-moderate)',
                  color: 'var(--text-muted)',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 6,
                  outline: 'none',
                }}
              />
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: 'var(--clr-positive)',
                  wordBreak: 'break-all',
                }}
              >
                Output: {liveSanitizationPreview.sanitizedText}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--sp-4) var(--sp-6)',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div>
            {hasSavedKey && (
              <button
                type="button"
                className="btn btn-danger btn-xs"
                onClick={handlePurge}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={12} />
                Purge & Zeroize Key
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={closeConfigModal}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Lock size={13} />
              Save & Seal Key to Enclave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
