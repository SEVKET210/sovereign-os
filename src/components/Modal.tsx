import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number | string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, width = 480 }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="anim-enter-fade"
      style={{
        position: 'fixed', inset: 0,
        zIndex: 'var(--z-modal)' as unknown as number,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-6)',
      }}
    >
      <div
        className="anim-enter-scale"
        style={{
          width, maxWidth: '95vw', maxHeight: '90vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-moderate)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          willChange: 'transform, opacity',
        }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--sp-4) var(--sp-6)',
            borderBottom: '1px solid var(--border-hairline)',
          }}>
            <span className="type-title" style={{ fontSize: 'var(--text-md)' }}>{title}</span>
            <button className="btn btn-ghost btn-xs" onClick={onClose} style={{ padding: 4 }}>
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div style={{ padding: 'var(--sp-6)', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
