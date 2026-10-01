/* ============================================================
   SOVEREIGN-OS — Markdown Note & Brief Editor
   Structured specification editor with live syntax preview and AI injection.
   ============================================================ */

import React, { useState } from 'react';
import { FileText, Eye, Edit3, Sparkles } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

interface MarkdownNoteEditorProps {
  value: string;
  onChange: (notes: string) => void;
  onAiTrigger?: () => void;
}

export const MarkdownNoteEditor: React.FC<MarkdownNoteEditorProps> = ({
  value,
  onChange,
  onAiTrigger,
}) => {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={13} color="var(--clr-accent)" />
          <span className="label-overline" style={{ fontSize: '0.62rem' }}>
            NODE TECHNICAL NOTES & SPECIFICATIONS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {onAiTrigger && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={onAiTrigger}
              style={{
                fontSize: '0.62rem',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: 'var(--clr-accent)',
              }}
            >
              <Sparkles size={11} />
              AI Synthesize
            </button>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => {
              TactileSoundEngine.playClick();
              setIsPreview(!isPreview);
            }}
            style={{ fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {isPreview ? <Edit3 size={11} /> : <Eye size={11} />}
            {isPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      {isPreview ? (
        <div
          style={{
            minHeight: 140,
            maxHeight: 280,
            overflowY: 'auto',
            padding: '10px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {value || <span style={{ color: 'var(--text-muted)' }}>No specifications recorded for this node.</span>}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter technical brief, architectural constraints, or draft notes..."
          rows={6}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.5,
            resize: 'vertical',
            minHeight: 120,
          }}
        />
      )}
    </div>
  );
};
