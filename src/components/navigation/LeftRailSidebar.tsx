import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
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
} from 'lucide-react';
import { useThemeStore, THEME_PRESETS } from '../../store/themeStore';
import { useAudio } from '../../audio/useAudio';
import { useAiStore } from '../../stores/useAiStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useTeamStore } from '../../stores/useTeamStore';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { KeyDerivationBridge } from '../../services/crypto/KeyDerivationBridge';

interface NavItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; style?: React.CSSProperties }>;
  active?: boolean;
  badge?: string;
  badgeColor?: string;
  hasLiveDot?: boolean;
  onClick: () => void;
}

interface NavSection {
  heading: string;
  items: NavItem[];
}

interface LeftRailSidebarProps {
  onOpenSettingsDrawer?: () => void;
}

export const LeftRailSidebar: React.FC<LeftRailSidebarProps> = ({
  onOpenSettingsDrawer: _onOpenSettingsDrawer,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { theme, openDrawer: openThemeDrawer } = useThemeStore();
  const { enabled: audioEnabled, toggle: toggleAudio, click, nav } = useAudio();
  const { activeProvider, openConfigModal } = useAiStore();
  const viewMode = useKanbanStore((state) => state.viewMode);
  const setViewMode = useKanbanStore((state) => state.setViewMode);
  const pendingApprovalsCount = useTeamStore(
    (state) => state.pendingApprovals.filter((a) => a.status === 'PENDING_FOUNDER_APPROVAL').length
  );
  const navigate = useNavigate();
  const location = useLocation();

  const currentPreset = THEME_PRESETS.find((p) => p.id === theme) || THEME_PRESETS[0];

  const handleNavigate = (path: string, kanbanMode?: 'canvas' | 'kanban') => {
    click();
    nav();
    if (kanbanMode) {
      setViewMode(kanbanMode);
    }
    navigate(path);
  };

  const handleOpenCommandK = () => {
    TactileSoundEngine.playMechanicalTransient();
    window.dispatchEvent(new CustomEvent('open-command-k'));
  };

  const handleLockVault = () => {
    TactileSoundEngine.playVaultLock();
    KeyDerivationBridge.lockContext();
    sessionStorage.removeItem('sovereign-session');
    navigate('/');
  };

  const isRouteActive = (path: string, kanbanMode?: 'canvas' | 'kanban') => {
    if (path === '/blueprint' && kanbanMode) {
      return location.pathname === '/blueprint' && viewMode === kanbanMode;
    }
    return location.pathname === path;
  };

  const navSections: NavSection[] = [
    {
      heading: 'OPERASYONEL',
      items: [
        {
          id: 'treasury',
          title: 'Hazine & Nakit',
          desc: 'Nakit akışı ve rezervler',
          icon: LayoutDashboard,
          active: isRouteActive('/dashboard'),
          onClick: () => handleNavigate('/dashboard'),
        },
        {
          id: 'dag_canvas',
          title: 'Blueprint DAG',
          desc: 'Grafiksel iş akışı',
          icon: GitBranch,
          active: isRouteActive('/blueprint', 'canvas'),
          onClick: () => handleNavigate('/blueprint', 'canvas'),
        },
        {
          id: 'dag_kanban',
          title: 'Kanban Matrisi',
          desc: "5'li operasyon havuzu",
          icon: Kanban,
          active: isRouteActive('/blueprint', 'kanban'),
          onClick: () => handleNavigate('/blueprint', 'kanban'),
        },
        {
          id: 'vault',
          title: 'Kasa & Belgeler',
          desc: 'Zero-Knowledge AES-GCM',
          icon: HardDrive,
          active: isRouteActive('/vault'),
          onClick: () => handleNavigate('/vault'),
        },
      ],
    },
    {
      heading: 'EKİP & YÖNETİŞİM',
      items: [
        {
          id: 'team',
          title: 'Ekip & Yönetişim',
          desc: 'Roller ve yetkiler',
          icon: Users,
          active: isRouteActive('/team'),
          badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
          badgeColor: '#f59e0b',
          onClick: () => handleNavigate('/team'),
        },
        {
          id: 'comms',
          title: 'Haberleşme Rölesi',
          desc: 'Şifreli güvenli hat',
          icon: Radio,
          active: isRouteActive('/comms'),
          hasLiveDot: true,
          onClick: () => handleNavigate('/comms'),
        },
        {
          id: 'docs',
          title: 'Dokümantasyon',
          desc: 'Protokol & şartnameler',
          icon: BookOpen,
          active: isRouteActive('/docs'),
          onClick: () => handleNavigate('/docs'),
        },
      ],
    },
    {
      heading: 'ARAÇLAR & SİSTEM',
      items: [
        {
          id: 'command_k',
          title: 'Komut Paleti',
          desc: 'Hızlı erişim',
          icon: Command,
          badge: 'Ctrl+K',
          onClick: handleOpenCommandK,
        },
        {
          id: 'ai_enclave',
          title: 'Yapay Zeka',
          desc: `Sağlayıcı: ${activeProvider}`,
          icon: Bot,
          badge: activeProvider,
          onClick: () => {
            click();
            openConfigModal();
          },
        },
        {
          id: 'theme_selector',
          title: 'Görünüm & Tema',
          desc: currentPreset.name,
          icon: SlidersHorizontal,
          onClick: () => {
            click();
            openThemeDrawer();
          },
        },
        {
          id: 'settings',
          title: 'Sistem Ayarları',
          desc: 'Güvenlik & konfigürasyon',
          icon: Settings,
          active: isRouteActive('/settings'),
          onClick: () => handleNavigate('/settings'),
        },
      ],
    },
  ];

  return (
    <div
      style={{
        width: 58,
        flexShrink: 0,
        position: 'relative',
        zIndex: 85,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Expanding Floating Sidebar Container ────────────── */}
      <aside
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: isHovered ? 240 : 58,
          transition: 'width 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease',
          boxShadow: isHovered
            ? '6px 0 28px rgba(0, 0, 0, 0.65), 1px 0 0 var(--border-moderate)'
            : '1px 0 0 var(--border-subtle)',
          background: 'rgba(var(--bg-primary-raw, 6 11 24) / 0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 85,
          userSelect: 'none',
        }}
      >
        {/* ── Brand / Status Header ─────────────────────────── */}
        <div
          style={{
            height: 48,
            minHeight: 48,
            display: 'flex',
            alignItems: 'center',
            paddingInline: isHovered ? 14 : 0,
            justifyContent: isHovered ? 'flex-start' : 'center',
            gap: isHovered ? 12 : 0,
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(var(--bg-secondary-raw, 11 18 33) / 0.6)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Logo Mark */}
          <div
            style={{
              width: 30,
              height: 30,
              border: '1px solid var(--border-moderate)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'var(--bg-surface)',
              margin: isHovered ? 0 : '0 auto',
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

          {/* Expanded Brand Name */}
          {isHovered && (
            <div
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                minWidth: 0,
                animation: 'fadeIn 0.15s ease',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
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
                  fontSize: '0.58rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                ZERO-TRUST RAIL
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable Navigation Items ───────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: isHovered ? 'auto' : 'hidden',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingTop: 8,
            paddingBottom: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {navSections.map((section, sIdx) => (
            <div key={section.heading} style={{ marginBottom: 6 }}>
              {/* Section Heading (Visible only on hover) */}
              <div
                style={{
                  height: isHovered ? 18 : 0,
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.16s ease, height 0.16s ease',
                  overflow: 'hidden',
                  paddingInline: 14,
                  fontSize: '0.58rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {section.heading}
              </div>

              {/* Sub-divider line when collapsed between sections */}
              {!isHovered && sIdx > 0 && (
                <div
                  style={{
                    width: 24,
                    height: 1,
                    background: 'var(--border-subtle)',
                    margin: '4px auto 6px auto',
                  }}
                />
              )}

              {/* Section Items */}
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = !!item.active;

                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    title={item.title}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      width: isHovered ? 'calc(100% - 12px)' : 40,
                      height: 40,
                      marginInline: isHovered ? 6 : 'auto',
                      paddingInline: isHovered ? 10 : 0,
                      justifyContent: isHovered ? 'flex-start' : 'center',
                      borderRadius: 'var(--radius-sm)',
                      background: active
                        ? 'rgba(var(--accent-rgb, 14 165 233) / 0.14)'
                        : 'transparent',
                      border: `1px solid ${
                        active ? 'var(--border-moderate)' : 'transparent'
                      }`,
                      color: active ? 'var(--clr-accent)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: isHovered ? 10 : 0,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--bg-surface)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    {/* Active Route Pill Indicator on the left edge */}
                    {active && (
                      <div
                        style={{
                          position: 'absolute',
                          left: isHovered ? 2 : 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 3,
                          height: 20,
                          borderRadius: '0 2px 2px 0',
                          background: 'var(--clr-accent)',
                          boxShadow: '0 0 8px var(--clr-accent)',
                        }}
                      />
                    )}

                    {/* Icon Container with Notification Badges */}
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={19} strokeWidth={active ? 2.2 : 1.75} />

                      {/* Live Dot (e.g. Comms) */}
                      {item.hasLiveDot && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: '#10b981',
                            boxShadow: '0 0 4px #10b981',
                          }}
                        />
                      )}

                      {/* Pending Approvals Dot (ONLY for Team when there are actual pending approvals!) */}
                      {item.id === 'team' && pendingApprovalsCount > 0 && !isHovered && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -1,
                            right: -1,
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: '#f59e0b',
                            boxShadow: '0 0 5px #f59e0b',
                          }}
                        />
                      )}
                    </div>

                    {/* Expanded Label & Description */}
                    {isHovered && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          flex: 1,
                          minWidth: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textAlign: 'left',
                          animation: 'fadeIn 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: active ? 600 : 500,
                            lineHeight: 1.2,
                            color: active ? 'var(--clr-accent)' : 'var(--text-primary)',
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.62rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-muted)',
                            lineHeight: 1.2,
                          }}
                        >
                          {item.desc}
                        </div>
                      </div>
                    )}

                    {/* Expanded Badge / Pill */}
                    {isHovered && item.badge && (
                      <span
                        style={{
                          fontSize: '0.6rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-sm)',
                          background: item.badgeColor
                            ? `${item.badgeColor}22`
                            : 'var(--bg-secondary)',
                          border: `1px solid ${
                            item.badgeColor
                              ? `${item.badgeColor}55`
                              : 'var(--border-subtle)'
                          }`,
                          color: item.badgeColor || 'var(--text-muted)',
                          flexShrink: 0,
                          animation: 'fadeIn 0.15s ease',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer Controls ───────────────────────────────── */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(var(--bg-secondary-raw, 11 18 33) / 0.8)',
            padding: isHovered ? '8px 10px' : '8px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {/* Audio Mute Toggle */}
          <button
            onClick={() => {
              click();
              toggleAudio();
            }}
            title={audioEnabled ? 'Ses Efektlerini Kapat' : 'Ses Efektlerini Aç'}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: isHovered ? '100%' : 40,
              height: 36,
              marginInline: isHovered ? 0 : 'auto',
              paddingInline: isHovered ? 10 : 0,
              justifyContent: isHovered ? 'flex-start' : 'center',
              gap: isHovered ? 8 : 0,
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: audioEnabled ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-surface)';
              e.currentTarget.style.borderColor = 'var(--border-moderate)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            {audioEnabled ? (
              <Volume2 size={16} style={{ color: 'var(--clr-accent)', flexShrink: 0 }} />
            ) : (
              <VolumeX size={16} style={{ flexShrink: 0 }} />
            )}
            {isHovered && (
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  fontSize: '0.68rem',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                {audioEnabled ? 'SES AÇIK' : 'SES KAPALI'}
              </span>
            )}
          </button>

          {/* Lock Enclave Button */}
          <button
            onClick={handleLockVault}
            title="Kasayı Kilitle & Çıkış"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: isHovered ? '100%' : 40,
              height: 36,
              marginInline: isHovered ? 0 : 'auto',
              paddingInline: isHovered ? 10 : 0,
              justifyContent: isHovered ? 'flex-start' : 'center',
              gap: isHovered ? 8 : 0,
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.18)';
              e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(244, 63, 94, 0.25)';
            }}
          >
            <Lock size={15} style={{ flexShrink: 0 }} />
            {isHovered && (
              <span
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  letterSpacing: '0.04em',
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                KİLİTLE & ÇIKIŞ
              </span>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
};
