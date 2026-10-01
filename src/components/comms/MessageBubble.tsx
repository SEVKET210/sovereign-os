import React, { useState } from 'react';
import {
  Languages,
  ShieldCheck,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import type { MessagePayload, SupportedTranslationLang } from '../../types';
import { useCommsStore } from '../../stores/useCommsStore';
import { EphemeralCountdownBadge } from './EphemeralCountdownBadge';
import { EmbeddedBlueprintNode } from './EmbeddedBlueprintNode';
import { EmbeddedVaultManifest } from './EmbeddedVaultManifest';
import { DecisionSealBlock } from './DecisionSealBlock';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

interface MessageBubbleProps {
  message: MessagePayload;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelected,
  onToggleSelect,
}) => {
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const translateMessage = useCommsStore((state) => state.translateMessage);
  const markMessageRead = useCommsStore((state) => state.markMessageRead);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const clearanceColors: Record<string, { bg: string; text: string; border: string }> = {
    LEVEL_1: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    LEVEL_2: { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
    LEVEL_3: { bg: 'rgba(245, 158, 11, 0.1)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
    LEVEL_4: { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' },
  };

  const clrConfig = clearanceColors[message.senderClearance] || clearanceColors.LEVEL_1;

  const handleTranslateSelect = async (lang: SupportedTranslationLang) => {
    setShowTranslateMenu(false);
    setShowOriginal(false);
    await translateMessage(message.id, lang);
  };

  const displayedContent =
    message.translation && !showOriginal
      ? message.translation.translatedText
      : message.content;

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        background: isSelected
          ? 'rgba(59, 130, 246, 0.08)'
          : message.isSealed
          ? 'rgba(212, 175, 55, 0.04)'
          : 'transparent',
        border: isSelected
          ? '1px solid rgba(59, 130, 246, 0.3)'
          : message.isSealed
          ? '1px solid rgba(212, 175, 55, 0.15)'
          : '1px solid transparent',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
      onMouseEnter={() => {
        // Trigger read acknowledgment if single-read execution
        if (message.burnMode === 'burn_on_read' && !message.isRead) {
          markMessageRead(message.id);
        }
      }}
    >
      {/* Multi-select check for Decision Sealing */}
      <div
        onClick={onToggleSelect}
        title="Select message for Decision Sealing"
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          paddingTop: 3,
          color: isSelected ? 'var(--clr-accent)' : 'var(--text-muted)',
        }}
      >
        {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
      </div>

      {/* Operator Avatar */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-secondary)',
          border: `1px solid ${clrConfig.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.72rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: clrConfig.text,
          flexShrink: 0,
        }}
      >
        {message.senderAlias.slice(0, 2)}
      </div>

      {/* Main Message Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header line: Sender + Clearance + Time + Ephemeral Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-primary)',
            }}
          >
            {message.senderAlias}
          </span>

          <span
            style={{
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: 2,
              background: clrConfig.bg,
              color: clrConfig.text,
              border: `1px solid ${clrConfig.border}`,
            }}
          >
            {message.senderClearance}
          </span>

          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
            }}
          >
            {formattedTime}
          </span>

          {/* Ephemeral burn timer */}
          {message.isEphemeral && (
            <EphemeralCountdownBadge
              messageId={message.id}
              burnMode={message.burnMode}
              initialSeconds={message.burnTimerSeconds}
              isRead={message.isRead}
              onReadClick={() => markMessageRead(message.id)}
            />
          )}

          {/* Inline Translation Actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
            {message.translation ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '2px 5px',
                    borderRadius: 2,
                  }}
                  title="Zero-Knowledge Terminology Shield protected proprietary codenames and cryptographic hashes"
                >
                  <ShieldCheck size={10} />
                  <span>SHIELDED [{message.translation.shieldedCount}]</span>
                </span>

                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={10} />
                  <span>{showOriginal ? 'TRANSLATION' : 'ORIGINAL'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  TactileSoundEngine.playClick();
                  setShowTranslateMenu(!showTranslateMenu);
                }}
                title="Translate with Terminology Shield"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 6px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}
              >
                <Languages size={10} />
                <span>TRANSLATE</span>
              </button>
            )}

            {/* Translation Dropdown Menu */}
            {showTranslateMenu && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 4,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-moderate)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  padding: 4,
                  zIndex: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  minWidth: 110,
                }}
              >
                {(['en', 'tr', 'zh', 'de', 'ru'] as SupportedTranslationLang[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleTranslateSelect(lang)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      textAlign: 'left',
                      padding: '4px 8px',
                      borderRadius: 2,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--clr-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {lang.toUpperCase()} — {lang === 'tr' ? 'Türkçe' : lang === 'zh' ? '中文' : lang === 'de' ? 'Deutsch' : lang === 'ru' ? 'Русский' : 'English'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Text */}
        <div
          style={{
            fontSize: '0.82rem',
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-sans)',
            wordBreak: 'break-word',
          }}
        >
          {displayedContent}
        </div>

        {/* Embedded Blueprint DAG Task Node */}
        {message.embeddedBlueprintNodeId && (
          <EmbeddedBlueprintNode nodeId={message.embeddedBlueprintNodeId} />
        )}

        {/* Embedded Encrypted Vault Manifest */}
        {message.embeddedVaultManifestId && (
          <EmbeddedVaultManifest manifestId={message.embeddedVaultManifestId} />
        )}

        {/* Engraved Metallic Decision Seal Block */}
        {message.isSealed && message.sealLedgerBlock && (
          <DecisionSealBlock seal={message.sealLedgerBlock} />
        )}
      </div>
    </div>
  );
};
