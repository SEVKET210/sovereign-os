import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  LayoutDashboard,
  GitBranch,
  Kanban,
  HardDrive,
  Users,
  Radio,
  BookOpen,
  Command,
  Bot,
  SlidersHorizontal,
  Settings,
  Volume2,
  VolumeX,
  Lock,
  Shield,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useThemeStore, THEME_PRESETS } from '../store/themeStore';
import { useAudio } from '../audio/useAudio';
import { useAiStore } from '../stores/useAiStore';
import { useKanbanStore } from '../stores/useKanbanStore';
import { useTeamStore } from '../stores/useTeamStore';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { KeyDerivationBridge } from '../services/crypto/KeyDerivationBridge';

interface LeftNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettingsDrawer?: () => void;
}

export const LeftNavDrawer: React.FC<LeftNavDrawerProps> = ({
  isOpen,
  onClose,
  onOpenSettingsDrawer,
}) => {
  const { theme, openDrawer: openSettingsDrawer } = useThemeStore();
  const { enabled: audioEnabled, toggle: toggleAudio, click, nav } = useAudio();
  const { openConfigModal } = useAiStore();
  const setViewMode = useKanbanStore((state) => state.setViewMode);
  const pendingApprovalsCount = useTeamStore(
    (state) => state.pendingApprovals.filter((a) => a.status === 'PENDING_FOUNDER_APPROVAL').length
  );
  const navigate = useNavigate();
  const location = useLocation();

  const currentPreset = THEME_PRESETS.find((p) => p.id === theme) || THEME_PRESETS[0];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNavigate = (path: string, kanbanMode?: 'canvas' | 'kanban') => {
    click();
    nav();
    if (kanbanMode) {
      setViewMode(kanbanMode);
    }
    navigate(path);
    onClose();
  };

  const handleOpenCommandK = () => {
    TactileSoundEngine.playMechanicalTransient();
    window.dispatchEvent(new CustomEvent('open-command-k'));
    onClose();
  };

  const handleLockVault = () => {
    TactileSoundEngine.playVaultLock();
    KeyDerivationBridge.lockContext();
    sessionStorage.removeItem('sovereign-session');
    onClose();
    navigate('/');
  };

  const isBlueprintActive = location.pathname === '/blueprint';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sol Navigasyon Çekmecesi"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      {/* ── Backdrop Scrim ─────────────────────────────────── */}
      <div
        onClick={() => {
          click();
          onClose();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      />

      {/* ── Sliding Left Off-Canvas Drawer ─────────────────── */}
      <aside
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 340,
          height: '100%',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-moderate)',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          animation: 'slide-in-left 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <div
          style={{
            height: 'var(--shell-header)',
            minHeight: 'var(--shell-header)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: 'var(--sp-5)',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(var(--bg-primary-raw, 6 11 24) / 0.75)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 26,
                height: 26,
                border: '1px solid var(--border-moderate)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-surface)',
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  border: `1.5px solid ${currentPreset.indicatorHex}`,
                  background: currentPreset.accentHex,
                  borderRadius: 2,
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                SOVEREIGN <span style={{ color: 'var(--clr-accent)' }}>OS</span>
              </div>
              <div
                style={{
                  fontSize: '0.62rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                LEVEL-4 ZERO-TRUST
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              click();
              onClose();
            }}
            title="Menüyü Kapat (ESC)"
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-moderate)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Scrollable Menu Content ───────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--sp-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
          }}
        >
          {/* Section 1: Core Operations */}
          <div>
            <div
              style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
                paddingInline: 8,
              }}
            >
              Operasyonel Modüller
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Treasury Dashboard */}
              <button
                onClick={() => handleNavigate('/dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: location.pathname === '/dashboard' ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${location.pathname === '/dashboard' ? 'var(--border-moderate)' : 'transparent'}`,
                  color: location.pathname === '/dashboard' ? 'var(--clr-accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/dashboard') {
                    e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/dashboard') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LayoutDashboard size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Hazine & Dashboard</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>

              {/* Blueprint DAG Canvas */}
              <button
                onClick={() => handleNavigate('/blueprint', 'canvas')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isBlueprintActive ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${isBlueprintActive ? 'var(--border-moderate)' : 'transparent'}`,
                  color: isBlueprintActive ? 'var(--clr-accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isBlueprintActive) {
                    e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isBlueprintActive) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <GitBranch size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Blueprint DAG Studio</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>

              {/* Kanban Matrix */}
              <button
                onClick={() => handleNavigate('/blueprint', 'kanban')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Kanban size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Kanban Matrisi</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>

              {/* Secure Vault */}
              <button
                onClick={() => handleNavigate('/vault')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: location.pathname === '/vault' ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${location.pathname === '/vault' ? 'var(--border-moderate)' : 'transparent'}`,
                  color: location.pathname === '/vault' ? 'var(--clr-accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/vault') {
                    e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/vault') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <HardDrive size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Kriptografik Kasa (Vault)</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>
            </div>
          </div>

          {/* Section 2: Team, Comms & Docs */}
          <div>
            <div
              style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
                paddingInline: 8,
              }}
            >
              Ekip & Yönetişim
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Team & HR */}
              <button
                onClick={() => handleNavigate('/team')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: location.pathname === '/team' ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${location.pathname === '/team' ? 'var(--border-moderate)' : 'transparent'}`,
                  color: location.pathname === '/team' ? 'var(--clr-accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/team') {
                    e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/team') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Personel & Ekip (HR)</span>
                </div>
                {pendingApprovalsCount > 0 ? (
                  <span
                    style={{
                      background: 'var(--clr-caution)',
                      color: '#000000',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                    }}
                  >
                    {pendingApprovalsCount}
                  </span>
                ) : (
                  <ChevronRight size={14} style={{ opacity: 0.4 }} />
                )}
              </button>

              {/* Comms Relay */}
              <button
                onClick={() => handleNavigate('/comms')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: location.pathname === '/comms' ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${location.pathname === '/comms' ? 'var(--border-moderate)' : 'transparent'}`,
                  color: location.pathname === '/comms' ? 'var(--clr-accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/comms') {
                    e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/comms') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Radio size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>İletişim & Röle (Comms)</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>

              {/* Docs & Briefs */}
              <button
                onClick={() => handleNavigate('/docs')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: location.pathname === '/docs' ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${location.pathname === '/docs' ? 'var(--border-moderate)' : 'transparent'}`,
                  color: location.pathname === '/docs' ? 'var(--clr-accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/docs') {
                    e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/docs') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BookOpen size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Şifreli Belgeler (Docs)</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>
            </div>
          </div>

          {/* Section 3: Tools & Intelligence */}
          <div>
            <div
              style={{
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
                paddingInline: 8,
              }}
            >
              Araçlar & Yapay Zeka
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Command Palette */}
              <button
                onClick={handleOpenCommandK}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Command size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Komut Paleti</span>
                </div>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 3,
                    padding: '1px 5px',
                  }}
                >
                  Ctrl+K
                </span>
              </button>

              {/* BYO AI Key Modal */}
              <button
                onClick={() => {
                  click();
                  openConfigModal();
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Bot size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Yapay Zeka (BYO AI)</span>
                </div>
                <Sparkles size={13} style={{ color: 'var(--clr-accent)', opacity: 0.8 }} />
              </button>

              {/* Theme & Visuals */}
              <button
                onClick={() => {
                  click();
                  if (onOpenSettingsDrawer) {
                    onOpenSettingsDrawer();
                  } else {
                    openSettingsDrawer();
                  }
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SlidersHorizontal size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Tema & Görünüm</span>
                </div>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: currentPreset.accentHex,
                    border: '1px solid var(--border-moderate)',
                  }}
                />
              </button>

              {/* System Settings */}
              <button
                onClick={() => handleNavigate('/settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: location.pathname === '/settings' ? 'var(--bg-surface)' : 'transparent',
                  border: `1px solid ${location.pathname === '/settings' ? 'var(--border-moderate)' : 'transparent'}`,
                  color: location.pathname === '/settings' ? 'var(--clr-accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (location.pathname !== '/settings') {
                    e.currentTarget.style.background = 'rgba(var(--bg-surface-raw, 30 41 59) / 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== '/settings') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Settings size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>Sistem Ayarları</span>
                </div>
                <ChevronRight size={14} style={{ opacity: 0.4 }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div
          style={{
            padding: 'var(--sp-4)',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(var(--bg-primary-raw, 6 11 24) / 0.85)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Audio Toggle */}
            <button
              onClick={() => {
                click();
                toggleAudio();
              }}
              title={audioEnabled ? 'Ses Efektlerini Kapat' : 'Ses Efektlerini Aç'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 9px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: audioEnabled ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {audioEnabled ? <Volume2 size={13} style={{ color: 'var(--clr-accent)' }} /> : <VolumeX size={13} />}
              <span>{audioEnabled ? 'SES AÇIK' : 'SES KAPALI'}</span>
            </button>

            {/* Enclave Shield Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Shield size={13} style={{ color: 'var(--clr-positive)' }} />
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--clr-positive)', fontWeight: 600 }}>
                SECURE
              </span>
            </div>
          </div>

          {/* Lock Enclave Button */}
          <button
            onClick={handleLockVault}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              letterSpacing: '0.04em',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.16)';
              e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.25)';
            }}
          >
            <Lock size={13} />
            <span>KASAYI KİLİTLE & ÇIKIŞ</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
