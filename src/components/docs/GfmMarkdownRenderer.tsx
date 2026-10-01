import React, { useState } from 'react';
import {
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  CheckSquare,
  Square,
} from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

interface GfmMarkdownRendererProps {
  content: string;
  onContentChange?: (newContent: string) => void;
}

export const GfmMarkdownRenderer: React.FC<GfmMarkdownRendererProps> = ({
  content,
  onContentChange,
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    TactileSoundEngine.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeIdx(idx);
      setTimeout(() => setCopiedCodeIdx(null), 2000);
    }
  };

  const handleToggleCheckbox = (lineIndex: number, currentChecked: boolean) => {
    if (!onContentChange) return;
    TactileSoundEngine.playClick();
    const lines = content.split('\n');
    const targetLine = lines[lineIndex];
    if (targetLine) {
      if (currentChecked) {
        lines[lineIndex] = targetLine.replace('- [x]', '- [ ]').replace('- [X]', '- [ ]');
      } else {
        lines[lineIndex] = targetLine.replace('- [ ]', '- [x]');
      }
      onContentChange(lines.join('\n'));
    }
  };

  // Line-by-line lightweight parser
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';
  let codeBlockIndex = 0;

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (inTable && tableHeader.length > 0) {
      renderedElements.push(
        <div
          key={`table_${renderedElements.length}`}
          style={{
            marginBlock: '12px',
            overflowX: 'auto',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.74rem',
            }}
          >
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-moderate)' }}>
                {tableHeader.map((th, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '6px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      borderRight: i < tableHeader.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    {th.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={{
                    borderBottom: rIdx < tableRows.length - 1 ? '1px solid var(--border-hairline)' : 'none',
                    background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)',
                  }}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      style={{
                        padding: '6px 12px',
                        color: 'var(--text-secondary)',
                        borderRight: cIdx < row.length - 1 ? '1px solid var(--border-hairline)' : 'none',
                      }}
                    >
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeader = [];
      tableRows = [];
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // Code block delimiters
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        flushTable();
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
        codeBuffer = [];
      } else {
        const fullCode = codeBuffer.join('\n');
        const currentIdx = codeBlockIndex++;
        renderedElements.push(
          <div
            key={`code_${idx}`}
            style={{
              marginBlock: '10px',
              borderRadius: 'var(--radius-sm)',
              background: '#040711',
              border: '1px solid var(--border-moderate)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 10px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-hairline)',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
              }}
            >
              <span>{codeLanguage ? codeLanguage.toUpperCase() : 'CODE'}</span>
              <button
                onClick={() => handleCopyCode(fullCode, currentIdx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedCodeIdx === currentIdx ? '#10b981' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '0.65rem',
                }}
              >
                {copiedCodeIdx === currentIdx ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedCodeIdx === currentIdx ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>
            <pre
              style={{
                padding: 10,
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.74rem',
                color: '#60a5fa',
                lineHeight: 1.5,
                overflowX: 'auto',
              }}
            >
              {fullCode}
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Markdown Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      // If divider row (e.g. |:---|:---|)
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
        tableRows = [];
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable();
    }

    // Callout Blocks (> [!NOTE], > [!WARNING], > [!CRITICAL], > [!IMPORTANT], > [!TIP])
    if (trimmed.startsWith('> [!')) {
      const tagMatch = trimmed.match(/> \[!([A-Z]+)\]/);
      const tag = tagMatch ? tagMatch[1] : 'NOTE';

      // Collect all following lines starting with >
      const calloutLines: string[] = [];
      let forwardIdx = idx + 1;
      while (forwardIdx < lines.length && lines[forwardIdx].trim().startsWith('>')) {
        calloutLines.push(lines[forwardIdx].trim().replace(/^>\s?/, ''));
        forwardIdx++;
      }
      idx = forwardIdx - 1;

      const calloutStyles: Record<string, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
        NOTE: { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.3)', color: '#60a5fa', icon: <Info size={14} /> },
        WARNING: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b', icon: <AlertTriangle size={14} /> },
        CRITICAL: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', icon: <AlertCircle size={14} /> },
        IMPORTANT: { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.3)', color: '#c084fc', icon: <AlertCircle size={14} /> },
        TIP: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)', color: '#34d399', icon: <CheckCircle2 size={14} /> },
      };

      const cStyle = calloutStyles[tag] || calloutStyles.NOTE;

      renderedElements.push(
        <div
          key={`callout_${idx}`}
          style={{
            marginBlock: '10px',
            padding: '10px 14px',
            background: cStyle.bg,
            borderLeft: `3px solid ${cStyle.color}`,
            borderTop: `1px solid ${cStyle.border}`,
            borderRight: `1px solid ${cStyle.border}`,
            borderBottom: `1px solid ${cStyle.border}`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            gap: 10,
          }}
        >
          <div style={{ color: cStyle.color, marginTop: 1, flexShrink: 0 }}>
            {cStyle.icon}
          </div>
          <div style={{ fontSize: '0.78rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: cStyle.color, fontSize: '0.7rem', marginBottom: 2 }}>
              {tag}
            </div>
            {calloutLines.map((cl, i) => (
              <div key={i}>{cl}</div>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // Standard Blockquote
    if (trimmed.startsWith('>')) {
      renderedElements.push(
        <blockquote
          key={`quote_${idx}`}
          style={{
            margin: '8px 0',
            paddingLeft: 12,
            borderLeft: '2px solid var(--clr-accent)',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            fontSize: '0.8rem',
            lineHeight: 1.5,
          }}
        >
          {trimmed.replace(/^>\s?/, '')}
        </blockquote>
      );
      continue;
    }

    // Interactive Checklist items (- [ ] or - [x])
    if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
      const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
      const label = trimmed.replace(/^-\s\[[xX ]\]\s?/, '');
      const currentLineIdx = idx;

      renderedElements.push(
        <div
          key={`check_${idx}`}
          onClick={() => handleToggleCheckbox(currentLineIdx, isChecked)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '3px 0',
            cursor: onContentChange ? 'pointer' : 'default',
            userSelect: 'none',
            fontSize: '0.78rem',
            color: isChecked ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: isChecked ? 'line-through' : 'none',
          }}
        >
          {isChecked ? (
            <CheckSquare size={14} style={{ color: '#10b981', flexShrink: 0 }} />
          ) : (
            <Square size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          )}
          <span>{label}</span>
        </div>
      );
      continue;
    }

    // Standard Bullet list item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      renderedElements.push(
        <div
          key={`bullet_${idx}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            padding: '2px 0 2px 10px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
          }}
        >
          <span style={{ color: 'var(--clr-accent)', marginTop: 2 }}>•</span>
          <span>{trimmed.slice(2)}</span>
        </div>
      );
      continue;
    }

    // Horizontal Divider
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      renderedElements.push(
        <hr
          key={`hr_${idx}`}
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-subtle)',
            marginBlock: '16px',
          }}
        />
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h1
          key={`h1_${idx}`}
          style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            marginBlock: '16px 8px',
            letterSpacing: '-0.02em',
          }}
        >
          {trimmed.slice(2)}
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h2
          key={`h2_${idx}`}
          style={{
            fontSize: '1.15rem',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            marginBlock: '14px 6px',
            letterSpacing: '-0.01em',
            borderBottom: '1px solid var(--border-hairline)',
            paddingBottom: 4,
          }}
        >
          {trimmed.slice(3)}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h3
          key={`h3_${idx}`}
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            marginBlock: '12px 4px',
          }}
        >
          {trimmed.slice(4)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      renderedElements.push(
        <h4
          key={`h4_${idx}`}
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            color: 'var(--clr-accent)',
            marginBlock: '10px 4px',
          }}
        >
          {trimmed.slice(5)}
        </h4>
      );
      continue;
    }

    // Empty line
    if (!trimmed) {
      renderedElements.push(<div key={`blank_${idx}`} style={{ height: 8 }} />);
      continue;
    }

    // Regular Paragraph
    renderedElements.push(
      <p
        key={`p_${idx}`}
        style={{
          fontSize: '0.82rem',
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          marginBlock: '4px',
        }}
      >
        {trimmed}
      </p>
    );
  }

  flushTable();

  return <div style={{ width: '100%' }}>{renderedElements}</div>;
};
