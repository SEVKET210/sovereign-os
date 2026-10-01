import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Settings,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Bot,
  Command,
} from 'lucide-react';
import { useThemeStore, THEME_PRESETS } from '../store/themeStore';
import { useLanguage } from '../services/i18n/LanguageContext';
import { useAudio } from '../audio/useAudio';
import { useAiStore } from '../stores/useAiStore';
import { useKanbanStore } from '../stores/useKanbanStore';
import { TactileSoundEngine } from '../services/audio/TactileSoundEngine';
import { RoleSwitcher } from './auth/RoleSwitcher';

interface NavbarProps {
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings: _onOpenSettings }) => {
  const { theme, openDrawer } = useThemeStore();
  const { language, setLanguage } = useLanguage();
  const { enabled, toggle: toggleAudio, click, nav } = useAudio();
  const { activeProvider, configs, inMemoryKeys, openConfigModal } = useAiStore();
  const viewMode = useKanbanStore((state) => state.viewMode);
  const location = useLocation();

  const hasKey =
    !!configs[activeProvider].encryptedKey ||
    !!inMemoryKeys[activeProvider] ||
    activeProvider === 'OLLAMA';

  const currentPreset = THEME_PRESETS.find((p) => p.id === theme) || THEME_PRESETS[0];

  const handleOpenCommandPalette = () => {
    TactileSoundEngine.playMechanicalTransient();
    window.dispatchEvent(new CustomEvent('open-command-k'));
  };

  const getRouteTitle = () => {
    if (location.pathname === '/dashboard') return 'HAZİNE & NAKİT AKIŞI';
    if (location.pathname === '/blueprint') {
      return viewMode === 'canvas' ? 'BLUEPRINT DAG // CANVAS' : 'BLUEPRINT DAG // KANBAN';
    }
    if (location.pathname === '/vault') return 'GÜVENLİ KASA // ZERO-KNOWLEDGE';
    if (location.pathname === '/team') return 'KURUCU ENKLAVI & EKİP';
    if (location.pathname === '/comms') return 'HABERLEŞME RÖLESİ // E2EE';
    if (location.pathname === '/docs') return 'KURUMSAL DOKÜMANTASYON';
    if (location.pathname === '/settings') return 'SİSTEM AYARLARI';
    return '';
  };

  const routeTitle = getRouteTitle();
  const isSettingsRoute = location.pathname === '/settings';

  return (
    <header
      style={{
        height: 'var(--shell-header)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        paddingInline: 'var(--sp-6)',
        width: '100%',
        background: 'rgba(var(--bg-primary-raw, 6 11 24) / 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-hairline)',
        zIndex: 'var(--z-nav)' as unknown as number,
        gap: 'var(--sp-3)',
      }}
    >
      {/* ── Logotype & Active Route Breadcrumb ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexShrink: 0 }}>
        <NavLink
          to="/"
          onClick={() => { click(); nav(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', textDecoration: 'none', flexShrink: 0 }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: '1px solid var(--border-moderate)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'var(--bg-secondary)',
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
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            SOVEREIGN
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.15em' }}>OS</span>
          </span>
        </NavLink>

        {routeTitle && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              paddingLeft: 12,
              borderLeft: '1px solid var(--border-subtle)',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--clr-accent)',
              letterSpacing: '0.04em',
              fontWeight: 500,
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span>{routeTitle}</span>
          </div>
        )}
      </div>

      {/* ── Right Controls ───────────────────────────────────── */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexShrink: 0 }}>
        {/* Active Role & Permissions Switcher */}
        <RoleSwitcher />

        {/* Command Palette */}
        <button
          onClick={handleOpenCommandPalette}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <Command size={11} color="var(--clr-accent)" />
          <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>CTRL+K</span>
        </button>

        {/* BYO-AI */}
        <button
          onClick={() => { click(); openConfigModal(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}
        >
          <Bot size={13} color="var(--clr-accent)" />
          <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>{activeProvider}</span>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: hasKey ? 'var(--clr-positive)' : 'var(--clr-caution)' }} />
        </button>

        {/* Theme Drawer */}
        <button
          onClick={() => { click(); openDrawer(); }}
          id="theme-drawer-trigger"
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '4px 10px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}
        >
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: currentPreset.indicatorHex, border: `1px solid ${currentPreset.accentHex}`, flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
            {currentPreset.name.split(' ')[0]}
          </span>
          <SlidersHorizontal size={11} strokeWidth={1.75} color="var(--text-muted)" />
        </button>

        {/* Audio Toggle */}
        <button
          onClick={() => { click(); toggleAudio(); }}
          style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          {enabled ? <Volume2 size={13} strokeWidth={1.75} /> : <VolumeX size={13} strokeWidth={1.75} />}
        </button>

        {/* Quick Language Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px',
            gap: 2,
          }}
        >
          <button
            onClick={() => { click(); setLanguage('tr'); }}
            title="Türkçe (TR)"
            style={{
              padding: '2px 6px',
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: language === 'tr' ? 700 : 400,
              border: 'none',
              borderRadius: 2,
              background: language === 'tr' ? 'var(--clr-accent)' : 'transparent',
              color: language === 'tr' ? '#060B18' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            TR
          </button>
          <button
            onClick={() => { click(); setLanguage('en'); }}
            title="English (EN)"
            style={{
              padding: '2px 6px',
              fontSize: '0.62rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: language === 'en' ? 700 : 400,
              border: 'none',
              borderRadius: 2,
              background: language === 'en' ? 'var(--clr-accent)' : 'transparent',
              color: language === 'en' ? '#060B18' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            EN
          </button>
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--border-subtle)', marginInline: 'var(--sp-1)' }} />

        {/* Settings */}
        <NavLink
          to="/settings"
          onClick={() => nav()}
          style={{
            display: 'flex', alignItems: 'center', padding: '6px',
            color: isSettingsRoute ? 'var(--clr-accent)' : 'var(--text-muted)', textDecoration: 'none',
          }}
        >
          <Settings size={13} strokeWidth={1.75} />
        </NavLink>
      </div>
    </header>
  );
};
