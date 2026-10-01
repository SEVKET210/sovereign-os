import React from 'react';
import { Check } from 'lucide-react';
import { useTheme, type ThemePresetMetadata } from '../../services/theme/ThemeContext';
import { TactileSoundEngine } from '../../services/audio/TactileSoundEngine';
import { showToast } from '../Toast';

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme, presets } = useTheme();

  const handleSelect = (p: ThemePresetMetadata) => {
    TactileSoundEngine.playClick();
    setTheme(p.id);
    showToast(`Theme switched to ${p.name} (Zero reload).`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {presets.map((preset) => {
        const isSelected = theme === preset.id;
        return (
          <div
            key={preset.id}
            onClick={() => handleSelect(preset)}
            className="interactive"
            style={{
              padding: 'var(--sp-4)',
              borderRadius: 'var(--radius-md)',
              background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
              border: `1px solid ${isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {preset.name}
                </span>
                {isSelected && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '1px 5px',
                      borderRadius: 2,
                      background: 'var(--clr-accent-alpha)',
                      border: '1px solid var(--border-accent)',
                      fontSize: '0.62rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--clr-accent)',
                      fontWeight: 600,
                    }}
                  >
                    <Check size={10} strokeWidth={2.5} />
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Swatches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div title={`Substrate: ${preset.bgHex}`} style={{ width: 14, height: 14, borderRadius: 2, background: preset.bgHex, border: `1px solid ${preset.borderHex}` }} />
                <div title={`Card: ${preset.cardHex}`} style={{ width: 14, height: 14, borderRadius: 2, background: preset.cardHex, border: `1px solid ${preset.borderHex}` }} />
                <div title={`Accent: ${preset.accentHex}`} style={{ width: 14, height: 14, borderRadius: 2, background: preset.accentHex, border: '1px solid rgba(255,255,255,0.2)' }} />
                <div title={`Indicator: ${preset.indicatorHex}`} style={{ width: 8, height: 8, borderRadius: '50%', background: preset.indicatorHex, marginLeft: 2 }} />
              </div>
            </div>

            <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {preset.subtitle}
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              {preset.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};
