/* ============================================================
   SOVEREIGN-OS — Task Checklist Engine
   High-density subtask execution and AI batch injection component.
   ============================================================ */

import React, { useState } from 'react';
import { CheckSquare, Square, Plus, Trash2, Sparkles } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskChecklistEngineProps {
  items: ChecklistItem[];
  onChange: (updated: ChecklistItem[]) => void;
  onAiTrigger?: () => void;
}

export const TaskChecklistEngine: React.FC<TaskChecklistEngineProps> = ({
  items,
  onChange,
  onAiTrigger,
}) => {
  const [newText, setNewText] = useState('');

  const handleToggle = (id: string) => {
    TactileSoundEngine.playClick();
    const updated = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onChange(updated);
  };

  const handleAdd = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    TactileSoundEngine.playClick();
    const newItem: ChecklistItem = {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      completed: false,
    };
    onChange([...items, newItem]);
    setNewText('');
  };

  const handleDelete = (id: string) => {
    TactileSoundEngine.playClick();
    onChange(items.filter((item) => item.id !== id));
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {/* Header & Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="label-overline" style={{ fontSize: '0.62rem' }}>
            OPERATIONAL SUBTASKS ({completedCount}/{items.length})
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem',
              color: progressPercent === 100 ? 'var(--clr-positive)' : 'var(--clr-accent)',
            }}
          >
            {progressPercent}%
          </span>
        </div>

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
            AI Draft
          </button>
        )}
      </div>

      {/* Progress Track */}
      <div
        style={{
          width: '100%',
          height: 3,
          background: 'var(--border-hairline)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: progressPercent === 100 ? 'var(--clr-positive)' : 'var(--clr-accent)',
            transition: 'width var(--dur-base) var(--ease-out)',
          }}
        />
      </div>

      {/* Checklist List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)',
              background: item.completed ? 'rgba(255, 255, 255, 0.01)' : 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              transition: 'background var(--dur-fast)',
            }}
          >
            <button
              type="button"
              onClick={() => handleToggle(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 'none',
                color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: item.completed ? 'line-through' : 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                textAlign: 'left',
                flex: 1,
              }}
            >
              {item.completed ? (
                <CheckSquare size={14} color="var(--clr-positive)" />
              ) : (
                <Square size={14} color="var(--text-muted)" />
              )}
              <span>{item.text}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Add New Item */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add operational subtask..."
          style={{
            flex: 1,
            padding: '6px 10px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-moderate)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
          }}
        />
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={handleAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Plus size={12} />
          Add
        </button>
      </div>
    </div>
  );
};
