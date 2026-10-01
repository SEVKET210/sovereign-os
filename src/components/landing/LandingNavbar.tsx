import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { useTheme } from '../../services/theme/ThemeContext';
import { useLanguage } from '../../services/i18n/LanguageContext';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

export const LandingNavbar: React.FC = () => {
  const navigate = useNavigate();
  const { activePreset } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageChange = (lang: 'tr' | 'en') => {
    TactileSoundEngine.playClick();
    setLanguage(lang);
    showToast(lang === 'tr' ? 'Dil Türkçe olarak ayarlandı.' : 'Language set to English.', 'info');
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 'var(--z-nav)' as unknown as number,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 'var(--sp-6)',
        background: 'rgba(5, 5, 7, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* ── Wordmark & Brand ───────────────────────────────── */}
      <NavLink
        to="/"
        onClick={() => TactileSoundEngine.playClick()}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', textDecoration: 'none' }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-moderate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: activePreset.accentHex,
              border: `1.5px solid ${activePreset.indicatorHex}`,
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
          }}
        >
          SOVEREIGN
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.15em' }}>
            OS
          </span>
        </span>
      </NavLink>

      {/* ── Status Micro-LED ───────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-hairline)',
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--clr-positive)',
            boxShadow: '0 0 8px var(--clr-positive)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-2xs)',
            color: 'var(--text-secondary)',
            letterSpacing: '0.06em',
          }}
        >
          {t.navbar.status}
        </span>
      </div>

      {/* ── Actions & Language Switcher ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        {/* Language Switcher Segmented Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 2,
            gap: 2,
          }}
        >
          <button
            onClick={() => handleLanguageChange('tr')}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              background: language === 'tr' ? 'var(--bg-surface)' : 'transparent',
              border: `1px solid ${language === 'tr' ? 'var(--border-moderate)' : 'transparent'}`,
              color: language === 'tr' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
          >
            TR
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              background: language === 'en' ? 'var(--bg-surface)' : 'transparent',
              border: `1px solid ${language === 'en' ? 'var(--border-moderate)' : 'transparent'}`,
              color: language === 'en' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
          >
            EN
          </button>
        </div>

        {/* Sign In / Enter Action */}
        <button
          className="btn btn-secondary btn-xs"
          id="nav-auth-login-btn"
          onClick={() => {
            TactileSoundEngine.playClick();
            navigate('/auth');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            fontSize: '0.67rem',
            fontFamily: 'var(--font-mono)',
            border: '1px solid var(--border-moderate)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        >
          {language === 'tr' ? 'Giriş Yap' : 'Sign In'}
        </button>

        {/* Enter Vault Action */}
        <button
          className="btn btn-primary btn-xs"
          onClick={() => {
            TactileSoundEngine.playVaultLock();
            navigate('/auth');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px' }}
        >
          <Shield size={12} />
          {t.navbar.enterVault}
          <ArrowRight size={12} />
        </button>
      </div>
    </header>
  );
};
