import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashDisplayProps {
  hash: string;
  label?: string;
  truncate?: boolean;
  color?: string;
  id?: string;
}

export const HashDisplay: React.FC<HashDisplayProps> = ({
  hash, label, truncate = true, color, id,
}) => {
  const [copied, setCopied] = useState(false);

  const display = truncate
    ? `${hash.slice(0, 10)}…${hash.slice(-8)}`
    : hash;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div id={id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {label && (
        <span className="label-overline" style={{ fontSize: 'var(--text-2xs)' }}>{label}</span>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        padding: '5px 8px',
        /* Fixed height — zero CLS */
        height: 30,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-2xs)',
          color: color ?? 'var(--clr-accent)',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '0.05em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {display}
        </span>
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
            color: copied ? 'var(--clr-positive)' : 'var(--text-muted)',
            padding: 0, flexShrink: 0,
            transition: 'color var(--dur-fast) var(--ease-out)',
          }}
        >
          {copied ? <Check size={11} strokeWidth={2} /> : <Copy size={11} strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  );
};
