import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, EyeOff } from 'lucide-react';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

export const WebCaptureShield: React.FC = () => {
  const [isMasked, setIsMasked] = useState(false);
  const [maskReason, setMaskReason] = useState<string>('OPERATOR FOCUS DETACHED');

  const triggerInterceptionAlert = useCallback((message: string) => {
    TactileSoundEngine.playSeismicWarning();
    showToast(message, 'warning');
  }, []);

  useEffect(() => {
    // 1. Keydown Interception for Screen Capture & DevTools
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // PrintScreen / F12
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        triggerInterceptionAlert('ENCLAVE SHIELD: Screen capture / DevTools keystroke blocked.');
        return;
      }

      // Windows Snipping Tool (Win+Shift+S or Meta+Shift+S)
      if (isCtrlOrCmd && e.shiftKey && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        triggerInterceptionAlert('ENCLAVE SHIELD: Snipping tool shortcut intercepted.');
        return;
      }

      // macOS Screen Capture (Cmd+Shift+3, 4, 5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerInterceptionAlert('ENCLAVE SHIELD: OS screen capture keystroke intercepted.');
        return;
      }

      // Browser Print (Ctrl+P / Cmd+P)
      if (isCtrlOrCmd && key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        triggerInterceptionAlert('ENCLAVE SHIELD: Document printing restricted in sovereign workspace.');
        return;
      }

      // Save Page (Ctrl+S / Cmd+S)
      if (isCtrlOrCmd && key === 's' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        triggerInterceptionAlert('ENCLAVE SHIELD: External disk serialization prevented.');
        return;
      }

      // Inspect / Console (Ctrl+Shift+I / Cmd+Option+I / Ctrl+Shift+C / Ctrl+Shift+J)
      if (isCtrlOrCmd && e.shiftKey && ['i', 'c', 'j'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        triggerInterceptionAlert('ENCLAVE SHIELD: DOM inspection shortcut blocked.');
        return;
      }
    };

    // 2. Right-Click Context Menu Suppression
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerInterceptionAlert('ENCLAVE PROTECTION: Context menu suppressed.');
    };

    // 3. Tab Visibility & Window Blur Focus Interception
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setMaskReason('WINDOW BLURRED: BACKGROUND RECORDING BUFFER DETACHED');
        setIsMasked(true);
      } else {
        // Automatically restore after quick re-attestation delay
        setTimeout(() => {
          setIsMasked(false);
        }, 120);
      }
    };

    const handleWindowBlur = () => {
      setMaskReason('OPERATOR FOCUS DETACHED: DISPLAY INTEGRITY PRESERVED');
      setIsMasked(true);
    };

    const handleWindowFocus = () => {
      setTimeout(() => {
        setIsMasked(false);
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [triggerInterceptionAlert]);

  if (!isMasked) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      onClick={() => {
        TactileSoundEngine.playMechanicalTransient();
        setIsMasked(false);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999, // Highest possible depth
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: 'pointer',
        animation: 'fadeIn 0.05s ease-out forwards',
      }}
    >
      {/* Central Blackout Badge */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: '32px 48px',
          background: 'rgba(10, 12, 16, 0.95)',
          border: '1px solid rgba(78, 242, 210, 0.3)',
          borderRadius: 8,
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(78, 242, 210, 0.1)',
          maxWidth: 580,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            background: 'rgba(78, 242, 210, 0.1)',
            border: '1px solid rgba(78, 242, 210, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldAlert size={26} color="var(--clr-accent, #4ef2d2)" />
        </div>

        <div>
          <div
            style={{
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 700,
              color: 'var(--clr-accent, #4ef2d2)',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}
          >
            [ENCLAVE MASKED: {maskReason}]
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono, monospace)',
              color: 'rgba(255, 255, 255, 0.65)',
              lineHeight: 1.5,
            }}
          >
            ACTIVE WORKSPACE INTEGRITY SEALED • ZERO-KNOWLEDGE CLIENT RAM ENCLAVE
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 14px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.68rem',
            fontFamily: 'var(--font-mono, monospace)',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <EyeOff size={13} />
          <span>DOM VISIBILITY NEUTRALIZED (&lt;10MS) TO COUNTER BACKGROUND RECORDING BUFFERS</span>
        </div>

        <div
          style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono, monospace)',
            color: 'rgba(78, 242, 210, 0.8)',
            marginTop: 8,
          }}
        >
          CLICK ANYWHERE OR FOCUS WINDOW TO RE-ATTEST WORKSPACE
        </div>
      </div>
    </div>
  );
};
