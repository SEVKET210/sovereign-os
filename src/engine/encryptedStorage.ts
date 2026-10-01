/* ============================================================
   SOVEREIGN-OS — Encrypted Local Storage Provider
   Client-Side AES-256-GCM Cryptographic Persistence
   Zero external dependencies (Web Crypto API)
   ============================================================ */

export type Theme = 'obsidian' | 'nordic' | 'brass' | 'cypherpunk';

export interface EncryptedThemeRecord {
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2-SHA256';
  iv: string;         // Base64 12-byte IV
  ciphertext: string; // Base64 ciphertext
  timestamp: number;
  version: number;
}

const STORAGE_KEY = 'sovereign_theme_enc';
const SALT_STR = 'sovereign-os-theme-vault-salt-v3';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cachedKey: CryptoKey | null = null;

/**
 * Derives a deterministic client-side 256-bit AES-GCM key
 * using PBKDF2 with SHA-256 from device fingerprint and system salt.
 */
async function getDeviceKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const entropy = [
    typeof window !== 'undefined' ? window.location.origin : 'sovereign-origin',
    typeof navigator !== 'undefined' ? navigator.userAgent : 'sovereign-agent',
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '1920x1080x24',
    typeof navigator !== 'undefined' ? navigator.language : 'en-US',
  ].join('::');

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(entropy),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT_STR),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedKey;
}

/**
 * Encrypts and persists the selected theme preset into localStorage.
 * Zero plaintext theme names are ever stored.
 */
export async function saveEncryptedTheme(theme: Theme): Promise<EncryptedThemeRecord> {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const payload = JSON.stringify({
    theme,
    timestamp: Date.now(),
    verified: true,
  });

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(payload)
  );

  // Convert binary to base64
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)));

  const record: EncryptedThemeRecord = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2-SHA256',
    iv: ivBase64,
    ciphertext: cipherBase64,
    timestamp: Date.now(),
    version: 3,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn('[EncryptedStorage] LocalStorage write error:', err);
  }

  return record;
}

/**
 * Loads and decrypts the persisted theme from localStorage.
 */
export async function loadEncryptedTheme(): Promise<{ theme: Theme; record: EncryptedThemeRecord } | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const record: EncryptedThemeRecord = JSON.parse(raw);
    if (!record.iv || !record.ciphertext) return null;

    const key = await getDeviceKey();
    const iv = Uint8Array.from(atob(record.iv), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(record.ciphertext), (c) => c.charCodeAt(0));

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    const decrypted = JSON.parse(decoder.decode(plainBuffer));
    const themeName = decrypted.theme;

    // Validate theme preset name
    const validThemes: Theme[] = ['obsidian', 'nordic', 'brass', 'cypherpunk'];
    if (validThemes.includes(themeName)) {
      return { theme: themeName, record };
    }

    // Backwards compatibility migration
    if (themeName === 'dark') return { theme: 'obsidian', record };
    if (themeName === 'light') return { theme: 'nordic', record };
    if (themeName === 'sovereign') return { theme: 'brass', record };

    return null;
  } catch (err) {
    console.warn('[EncryptedStorage] Decryption failure or corrupted store:', err);
    return null;
  }
}

/**
 * Synchronously retrieves the current raw encrypted record from localStorage
 * for inspection and telemetry display.
 */
export function getStoredEncryptedRecord(): EncryptedThemeRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Verifies that the stored ciphertext can be decrypted and matches
 * valid cryptographic integrity parameters.
 */
export async function verifyEncryptedStorage(): Promise<{
  valid: boolean;
  theme?: Theme;
  timestamp?: number;
  error?: string;
}> {
  try {
    const result = await loadEncryptedTheme();
    if (!result) {
      return { valid: false, error: 'No encrypted theme record found.' };
    }
    return {
      valid: true,
      theme: result.theme,
      timestamp: result.record.timestamp,
    };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Verification error' };
  }
}
