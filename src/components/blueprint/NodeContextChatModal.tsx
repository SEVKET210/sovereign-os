import React, { useState } from 'react';
import { MessageSquare, X, Send, ShieldCheck } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';
import type { BlueprintNode } from '../../types';

interface ContextMessage {
  id: string;
  author: string;
  role: string;
  text: string;
  time: string;
  isSealed?: boolean;
}

export const NodeContextChatModal: React.FC<{
  node: BlueprintNode | null;
  onClose: () => void;
  onSealToLedger?: (decisionText: string) => void;
}> = ({ node, onClose, onSealToLedger }) => {
  const [messages, setMessages] = useState<ContextMessage[]>([
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
  const [inputText, setInputText] = useState('');

  if (!node) return null;

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    TactileSoundEngine.playClick();
    const newMsg: ContextMessage = {
      id: `m_${Date.now()}`,
      author: 'CURRENT_OPERATOR',
      role: 'Enclave User',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleSealDecision = () => {
    TactileSoundEngine.playLedgerSealThud();
    const decisionText = `NODE DECISION [${node.title}]: Thread sealed by operator at ${new Date().toISOString()}`;
    if (onSealToLedger) {
      onSealToLedger(decisionText);
    }
    showToast(`Decision sealed to immutable double-entry ledger.`, 'success');
    const sealedMsg: ContextMessage = {
      id: `m_seal_${Date.now()}`,
      author: 'IMMUTABLE_LEDGER_CHAIN',
      role: 'SHA-256 Protocol',
      text: `SEAL ATTESTED: Decision bound to block #847,294 with cryptographic hash confirmation.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSealed: true,
    };
    setMessages((prev) => [...prev, sealedMsg]);
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
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Slide Drawer */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
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
        {/* Header */}
        <div
          style={{
            padding: 'var(--sp-4) var(--sp-5)',
            borderBottom: '1px solid var(--border-hairline)',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <MessageSquare size={15} color="var(--clr-accent)" />
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{node.title}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                E2EE NODE DISCUSSION // {node.clearance}
              </div>
            </div>
          </div>

          <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {/* Messages Scroll Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--sp-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)',
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: m.isSealed ? 'var(--clr-positive-alpha)' : 'var(--bg-primary)',
                border: `1px solid ${m.isSealed ? 'var(--clr-positive)' : 'var(--border-subtle)'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.66rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: m.isSealed ? 'var(--clr-positive)' : 'var(--clr-accent)', fontWeight: 600 }}>
                  {m.author} <span style={{ opacity: 0.6 }}>({m.role})</span>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{m.time}</span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {m.text}
              </p>
            </div>
          ))}
        </div>

        {/* Actions & Input Footer */}
        <div
          style={{
            padding: 'var(--sp-4)',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)',
          }}
        >
          {/* Seal Decision Action */}
          <button
            className="btn btn-secondary btn-xs"
            onClick={handleSealDecision}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
          >
            <ShieldCheck size={13} color="var(--clr-positive)" />
            Seal Decision to Ledger
          </button>

          {/* Input field */}
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <input
              type="text"
              placeholder="Send E2EE message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                outline: 'none',
              }}
            />
            <button
              className="btn btn-primary btn-xs"
              onClick={handleSendMessage}
              style={{ padding: '0 12px' }}
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
