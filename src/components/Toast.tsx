import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

/* Status colors — functional, restrained */
const STATUS: Record<ToastType, { bg: string; border: string; dot: string }> = {
  success: { bg: 'var(--bg-secondary)', border: 'var(--clr-positive)',  dot: 'var(--clr-positive)' },
  warning: { bg: 'var(--bg-secondary)', border: 'var(--clr-caution)',   dot: 'var(--clr-caution)' },
  error:   { bg: 'var(--bg-secondary)', border: 'var(--clr-negative)',  dot: 'var(--clr-negative)' },
  info:    { bg: 'var(--bg-secondary)', border: 'var(--border-moderate)', dot: 'var(--clr-accent)' },
};

/* Global imperative API */
let _listeners: Array<(items: ToastItem[]) => void> = [];
let _items: ToastItem[] = [];

function _notify(next: ToastItem[]) {
  _items = next;
  _listeners.forEach((fn) => fn(next));
}

export function showToast(message: string, type: ToastType = 'info', duration = 3800): void {
  const id = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  _notify([..._items, { id, type, message, duration }]);
  if (duration > 0) {
    setTimeout(() => _notify(_items.filter((t) => t.id !== id)), duration);
  }
}

export function dismissToast(id: string): void {
  _notify(_items.filter((t) => t.id !== id));
}

export const ToastContainer: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _listeners.push(setItems);
    return () => { _listeners = _listeners.filter((fn) => fn !== setItems); };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 'var(--sp-5)',
      right: 'var(--sp-5)',
      zIndex: 'var(--z-toast)' as unknown as number,
      display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)',
      pointerEvents: 'none',
    }}>
      {items.map((item) => {
        const s = STATUS[item.type];
        return (
          <div
            key={item.id}
            className="anim-ticker-in"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)',
              padding: 'var(--sp-3) var(--sp-4)',
              background: s.bg,
              border: `1px solid var(--border-subtle)`,
              borderLeft: `2px solid ${s.border}`,
              borderRadius: 'var(--radius-md)',
              maxWidth: 340,
              pointerEvents: 'all',
              boxShadow: 'var(--shadow-md)',
              willChange: 'transform, opacity',
            }}
          >
            {/* Status dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: s.dot,
              flexShrink: 0, marginTop: 4,
            }} />

            <span style={{
              flex: 1,
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}>
              {item.message}
            </span>

            <button
              onClick={() => dismissToast(item.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 0, flexShrink: 0,
                display: 'flex', marginTop: 1,
              }}
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
