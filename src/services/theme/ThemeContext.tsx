/* ============================================================
   SOVEREIGN-OS — Theme Context Provider
   Reactive theme engine stored in client-side encrypted local storage
   Zero page reload guarantee
   ============================================================ */

import React, { createContext, useContext } from 'react';
import type { ThemePresetId } from '../../types';
import {
  type EncryptedThemeRecord,
} from '../../engine/encryptedStorage';
import { useThemeStore } from '../../store/themeStore';

export interface ThemePresetMetadata {
  id: ThemePresetId;
  name: string;
  subtitle: string;
  category: string;
  bgHex: string;
  cardHex: string;
  borderHex: string;
  accentHex: string;
  indicatorHex: string;
  description: string;
}

export const THEME_PRESETS_CATALOG: ThemePresetMetadata[] = [
  {
    id: 'obsidian',
    name: 'Stealth Obsidian',
    subtitle: 'Default / Sovereign Dark',
    category: 'Sovereign Core',
    bgHex: '#050507',
    cardHex: '#0c0c0f',
    borderHex: '#1f2026',
    accentHex: '#ffffff',
    indicatorHex: '#4ef2d2',
    description: 'Deepest obsidian #050507, Carbon card #0c0c0f, Muted zinc #1f2026, Titanium white #ffffff with cold muted cyan #4ef2d2 micro-indicators.',
  },
  {
    id: 'nordic',
    name: 'Nordic Titanium',
    subtitle: 'Industrial Cold Slate',
    category: 'Industrial Alloy',
    bgHex: '#0a0d12',
    cardHex: '#12161f',
    borderHex: '#1e2633',
    accentHex: '#70a5ff',
    indicatorHex: '#e2e8f0',
    description: 'Raw slate #0a0d12, Brushed alloy card #12161f, Cold steel #1e2633, Arctic ice blue #70a5ff and platinum #e2e8f0.',
  },
  {
    id: 'brass',
    name: 'Monastic Brass & Amber',
    subtitle: 'Horological Luxury',
    category: 'Horological Craft',
    bgHex: '#080706',
    cardHex: '#12100d',
    borderHex: '#262019',
    accentHex: '#e5a93c',
    indicatorHex: '#f5efe6',
    description: 'Smoked basalt #080706, Dark walnut ash #12100d, Antique bronze patina #262019, Warm amber gold #e5a93c and muted parchment #f5efe6.',
  },
  {
    id: 'cypherpunk',
    name: 'Cypherpunk High-Contrast',
    subtitle: 'Tactical Terminal',
    category: 'Tactical Console',
    bgHex: '#000000',
    cardHex: '#040604',
    borderHex: '#1a2e1d',
    accentHex: '#00ff66',
    indicatorHex: '#00ff66',
    description: 'Pure pitch black #000000, Phosphor console #040604, Monochromatic razor #1a2e1d, Stark matrix green #00ff66 and phosphor green telemetry markers.',
  },
];

interface ThemeContextType {
  theme: ThemePresetId;
  activePreset: ThemePresetMetadata;
  presets: ThemePresetMetadata[];
  encryptedRecord: EncryptedThemeRecord | null;
  setTheme: (theme: ThemePresetId) => void;
  toggleTheme: () => void;
  refreshEncryptedRecord: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useThemeStore((state) => state.theme);
  const encryptedRecord = useThemeStore((state) => state.encryptedRecord);
  const setThemeInStore = useThemeStore((state) => state.setTheme);
  const toggleThemeInStore = useThemeStore((state) => state.toggleTheme);
  const refreshAudit = useThemeStore((state) => state.refreshAudit);

  const setTheme = React.useCallback((nextTheme: ThemePresetId) => {
    setThemeInStore(nextTheme as any);
  }, [setThemeInStore]);

  const toggleTheme = React.useCallback(() => {
    toggleThemeInStore();
  }, [toggleThemeInStore]);

  const activePreset = THEME_PRESETS_CATALOG.find((p) => p.id === theme) || THEME_PRESETS_CATALOG[0];

  return (
    <ThemeContext.Provider
      value={{
        theme: theme as ThemePresetId,
        activePreset,
        presets: THEME_PRESETS_CATALOG,
        encryptedRecord,
        setTheme,
        toggleTheme,
        refreshEncryptedRecord: refreshAudit,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
