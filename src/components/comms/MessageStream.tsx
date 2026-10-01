import React, { useEffect, useRef } from 'react';
import { Shield, Lock } from 'lucide-react';
import { useCommsStore } from '../../stores/useCommsStore';
import { MessageBubble } from './MessageBubble';

export const MessageStream: React.FC = () => {
  const activeChannelId = useCommsStore((state) => state.activeChannelId);
  const messagesByChannel = useCommsStore((state) => state.messagesByChannel);
  const selectedMessageIds = useCommsStore((state) => state.selectedMessageIds);
  const toggleSelectMessage = useCommsStore((state) => state.toggleSelectMessage);

  const messages = messagesByChannel[activeChannelId] || [];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, activeChannelId]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minHeight: 0,
      }}
    >
      {/* Zero-Knowledge Security Notice at top of stream */}
      <div
        style={{
          margin: '4px auto 12px auto',
          padding: '6px 14px',
          background: 'rgba(var(--bg-secondary-raw, 13 22 40) / 0.5)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.66rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          textAlign: 'center',
          maxWidth: 480,
        }}
      >
        <Lock size={11} style={{ color: '#10b981', flexShrink: 0 }} />
        <span>
          ENCLAVE RELAY ACTIVE // Payloads encrypted client-side with AES-256-GCM. Physical VDS host holds 0 plaintext keys.
        </span>
      </div>

      {messages.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: 8,
          }}
        >
          <Shield size={24} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            CHANNEL BUFFER EMPTY — TRANSMIT ENCRYPTED ENVELOPE TO INITIATE
          </span>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSelected={selectedMessageIds.includes(msg.id)}
            onToggleSelect={() => toggleSelectMessage(msg.id)}
          />
        ))
      )}
    </div>
  );
};
