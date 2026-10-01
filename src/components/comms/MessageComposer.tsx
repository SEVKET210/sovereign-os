import React, { useState, useRef } from 'react';
import {
  Send,
  Flame,
  GitBranch,
  HardDrive,
  Slash,
  ShieldCheck,
  EyeOff,
  Clock,
  X,
} from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { useBlueprintStore } from '../../stores/useBlueprintStore';
import { useVaultStore } from '../../services/storage/useVaultStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import type { EphemeralBurnMode } from '../../types';

export const MessageComposer: React.FC = () => {
  const [text, setText] = useState('');
  const [burnMode, setBurnMode] = useState<EphemeralBurnMode>('none');
  const [attachedNodeId, setAttachedNodeId] = useState<string | null>(null);
  const [attachedVaultId, setAttachedVaultId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = useCommsStore((state) => state.sendMessage);
  const openSealingModal = useCommsStore((state) => state.openSealingModal);
  const selectedMessageIds = useCommsStore((state) => state.selectedMessageIds);
  const nodes = useBlueprintStore((state) => state.nodes);
  const vaultManifests = useVaultStore((state) => state.manifests);

  const handleSend = async () => {
    if (!text.trim() && !attachedNodeId && !attachedVaultId) return;

    await sendMessage(text, {
      burnMode,
      embeddedNodeId: attachedNodeId || undefined,
      embeddedVaultManifestId: attachedVaultId || undefined,
    });

    setText('');
    setBurnMode('none');
    setAttachedNodeId(null);
    setAttachedVaultId(null);
    setShowSlashMenu(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false);
      setShowNodePicker(false);
      setShowVaultPicker(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Auto grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    // Show slash command options if text starts with '/'
    if (val.trim() === '/') {
      setShowSlashMenu(true);
    } else if (!val.startsWith('/')) {
      setShowSlashMenu(false);
    }
  };

  const handleSelectSlashCommand = (cmd: string) => {
    TactileSoundEngine.playClick();
    setShowSlashMenu(false);

    if (cmd === '/node') {
      setShowNodePicker(true);
      setText('');
    } else if (cmd === '/vault') {
      setShowVaultPicker(true);
      setText('');
    } else if (cmd === '/burn') {
      setBurnMode(burnMode === '30s' ? 'burn_on_read' : '30s');
      setText('');
    } else if (cmd === '/seal') {
      setText('');
      if (selectedMessageIds.length > 0) {
        openSealingModal();
      }
    } else if (cmd === '/clear') {
      setText('');
    }
  };

  const cycleBurnMode = () => {
    TactileSoundEngine.playClick();
    if (burnMode === 'none') setBurnMode('30s');
    else if (burnMode === '30s') setBurnMode('burn_on_read');
    else setBurnMode('none');
  };

  return (
    <div
      style={{
        padding: '10px 14px',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-hairline)',
        position: 'relative',
      }}
    >
      {/* Slash Command Autocomplete Popover */}
      {showSlashMenu && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 14,
            marginBottom: 8,
            width: 280,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            padding: 6,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <div
            style={{
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              padding: '4px 8px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            SOVEREIGN ENCLAVE SLASH COMMANDS
          </div>

          {[
            { cmd: '/node', desc: 'Embed live Blueprint DAG task node', icon: <GitBranch size={12} /> },
            { cmd: '/vault', desc: 'Share encrypted Vault file manifest', icon: <HardDrive size={12} /> },
            { cmd: '/burn', desc: 'Toggle Ephemeral 30s / Single-Read mode', icon: <Flame size={12} /> },
            { cmd: '/seal', desc: 'Seal selected messages into ledger', icon: <ShieldCheck size={12} /> },
            { cmd: '/clear', desc: 'Clear transmission draft', icon: <Slash size={12} /> },
          ].map((item) => (
            <button
              key={item.cmd}
              onClick={() => handleSelectSlashCommand(item.cmd)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--clr-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
            >
              <span style={{ color: 'var(--clr-accent)' }}>{item.icon}</span>
              <span style={{ fontWeight: 600 }}>{item.cmd}</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {item.desc}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Node Picker Popover */}
      {showNodePicker && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 14,
            marginBottom: 8,
            width: 320,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            padding: 8,
            zIndex: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            <span>ATTACH BLUEPRINT DAG NODE</span>
            <X
              size={14}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowNodePicker(false)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {nodes.length === 0 ? (
              <div style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                Kayıtlı Blueprint düğümü bulunmuyor
              </div>
            ) : (
              nodes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setAttachedNodeId(n.id);
                    setShowNodePicker(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-hairline)',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                  }}
                >
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{n.title}</span>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#3b82f6' }}>
                    {n.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Vault Manifest Picker Popover */}
      {showVaultPicker && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 14,
            marginBottom: 8,
            width: 320,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
            padding: 8,
            zIndex: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            <span>ATTACH ENCRYPTED VAULT MANIFEST</span>
            <X
              size={14}
              style={{ cursor: 'pointer' }}
              onClick={() => setShowVaultPicker(false)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {vaultManifests.length === 0 ? (
              <div style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                Kayıtlı Vault dosyası bulunmuyor
              </div>
            ) : (
              vaultManifests.map((f) => (
                <div
                  key={f.manifestId}
                  onClick={() => {
                    TactileSoundEngine.playClick();
                    setAttachedVaultId(f.manifestId);
                    setShowVaultPicker(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-hairline)',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                  }}
                >
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {f.originalFileName}
                  </span>
                  <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                    {(f.trueByteLength / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Active Attachment Badges */}
      {(attachedNodeId || attachedVaultId) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {attachedNodeId && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: '#60a5fa',
              }}
            >
              <GitBranch size={11} />
              <span>LINKED NODE: {attachedNodeId}</span>
              <X
                size={11}
                style={{ cursor: 'pointer' }}
                onClick={() => setAttachedNodeId(null)}
              />
            </div>
          )}

          {attachedVaultId && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: '#f59e0b',
              }}
            >
              <HardDrive size={11} />
              <span>ATTACHED VAULT MANIFEST</span>
              <X
                size={11}
                style={{ cursor: 'pointer' }}
                onClick={() => setAttachedVaultId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Input Textarea */}
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder="Type zero-knowledge encrypted transmission or press '/' for commands..."
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '0.82rem',
          fontFamily: 'var(--font-sans)',
          resize: 'none',
          lineHeight: 1.4,
          maxHeight: 120,
        }}
      />

      {/* Bottom Actions Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {/* Left Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Ephemeral Mode Switcher */}
          <button
            onClick={cycleBurnMode}
            title="Cycle ephemeral burn-on-read modes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              background:
                burnMode === '30s'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : burnMode === 'burn_on_read'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'transparent',
              border: `1px solid ${
                burnMode === '30s'
                  ? 'rgba(245, 158, 11, 0.4)'
                  : burnMode === 'burn_on_read'
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'var(--border-hairline)'
              }`,
              color:
                burnMode === '30s'
                  ? '#f59e0b'
                  : burnMode === 'burn_on_read'
                  ? '#ef4444'
                  : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {burnMode === '30s' ? (
              <Clock size={11} />
            ) : burnMode === 'burn_on_read' ? (
              <EyeOff size={11} />
            ) : (
              <Flame size={11} />
            )}
            <span>
              {burnMode === '30s'
                ? 'EPHEMERAL // 30s BURN'
                : burnMode === 'burn_on_read'
                ? 'SINGLE-READ BURN'
                : 'PERSISTENT ZK'}
            </span>
          </button>

          {/* Attach Blueprint Node */}
          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              setShowNodePicker(!showNodePicker);
            }}
            title="Attach live Blueprint DAG node"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              background: 'transparent',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <GitBranch size={11} />
            <span>NODE</span>
          </button>

          {/* Attach Vault File */}
          <button
            onClick={() => {
              TactileSoundEngine.playClick();
              setShowVaultPicker(!showVaultPicker);
            }}
            title="Attach encrypted Vault file manifest"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              background: 'transparent',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <HardDrive size={11} />
            <span>VAULT</span>
          </button>
        </div>

        {/* Dispatch Button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() && !attachedNodeId && !attachedVaultId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background:
              text.trim() || attachedNodeId || attachedVaultId
                ? 'var(--clr-accent)'
                : 'var(--bg-surface)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            color:
              text.trim() || attachedNodeId || attachedVaultId
                ? '#000'
                : 'var(--text-muted)',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor:
              text.trim() || attachedNodeId || attachedVaultId
                ? 'pointer'
                : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
        >
          <span>ENCRYPT &amp; SEND</span>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};
