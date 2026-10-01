import { create } from 'zustand';
import {
  type Theme,
  type EncryptedThemeRecord,
  saveEncryptedTheme,
  loadEncryptedTheme,
  getStoredEncryptedRecord,
} from '../engine/encryptedStorage';

export type { Theme, EncryptedThemeRecord };

export interface ThemePresetInfo {
  id: Theme;
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

export const THEME_PRESETS: ThemePresetInfo[] = [
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
    description: 'Deepest obsidian substrate with carbon cards, crisp titanium white accents, and cold muted cyan micro-indicators.',
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
    description: 'Raw slate substrate with brushed alloy cards, cold steel borders, arctic ice blue accents, and platinum markers.',
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
    description: 'Smoked basalt substrate with dark walnut ash cards, antique bronze patina borders, and warm amber gold accents.',
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
    description: 'Pure pitch black substrate with razor phosphor green console borders, matrix green accents, and radioactive telemetry markers.',
  },
];

const THEME_ORDER: Theme[] = ['obsidian', 'nordic', 'brass', 'cypherpunk'];

interface ThemeStore {
  theme: Theme;
  encryptedRecord: EncryptedThemeRecord | null;
  isDrawerOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  refreshAudit: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'obsidian',
  encryptedRecord: getStoredEncryptedRecord(),
  isDrawerOpen: false,

  setTheme: (theme) => {
    // 1. Instant zero-reload DOM update
    applyThemeToDOM(theme);
    set({ theme });

    // 2. Persist encrypted in background (AES-256-GCM)
    saveEncryptedTheme(theme).then((record) => {
      set({ encryptedRecord: record });
    });
  },

  toggleTheme: () => {
    const current = get().theme;
    const idx = THEME_ORDER.indexOf(current);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    get().setTheme(next);
  },

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  refreshAudit: async () => {
    const res = await loadEncryptedTheme();
    if (res) {
      set({ theme: res.theme, encryptedRecord: res.record });
    } else {
      set({ encryptedRecord: getStoredEncryptedRecord() });
    }
  },
}));

export function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  const preset = THEME_PRESETS.find((p) => p.id === theme) || THEME_PRESETS[0];
  root.style.setProperty('--bg-primary', preset.bgHex);
  root.style.setProperty('--bg-secondary', preset.cardHex);
  root.style.setProperty('--clr-accent', preset.accentHex);
  root.style.setProperty('--clr-indicator', preset.indicatorHex);
  root.style.setProperty('--border-subtle', preset.borderHex);
}

// ── Client Bootstrap (Zero-Reload / Instant Sync) ───────────
if (typeof window !== 'undefined') {
  // Apply default obsidian immediately to prevent FOUC
  applyThemeToDOM('obsidian');

  // Asynchronously load and decrypt stored theme
  loadEncryptedTheme().then((loaded) => {
    if (loaded) {
      applyThemeToDOM(loaded.theme);
      useThemeStore.setState({
        theme: loaded.theme,
        encryptedRecord: loaded.record,
      });
    } else {
      // First boot: encrypt default preset
      saveEncryptedTheme('obsidian').then((rec) => {
        useThemeStore.setState({ encryptedRecord: rec });
      });
    }
  });

  // Clean up legacy plain-text key if present
  try {
    localStorage.removeItem('sovereign-theme');
  } catch {}
}
