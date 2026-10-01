/* ============================================================
   SOVEREIGN-OS — Crypto Engine
   Web Crypto API primitives (zero external deps)
   ============================================================ */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// ── SHA-256 ───────────────────────────────────────────────
export async function sha256(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Double Hash (for ledger entries) ─────────────────────
export async function doubleHash(data: string): Promise<string> {
  const first = await sha256(data);
  return sha256(first);
}

// ── PBKDF2 Key Derivation ─────────────────────────────────
export async function deriveKey(
  password: string,
  salt: string,
  iterations = 310_000
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── AES-GCM Encrypt ───────────────────────────────────────
export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  // Pack IV + ciphertext as base64
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

// ── AES-GCM Decrypt ───────────────────────────────────────
export async function decrypt(key: CryptoKey, ciphertext: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(plainBuffer);
}

// ── Rolling Single-Use Password (TOTP-like, client-side) ──
export function generateSUP(windowSeconds = 30): string {
  const counter = Math.floor(Date.now() / 1000 / windowSeconds);
  // Deterministic but session-unique seed from performance.now + counter
  const seed = `${counter}-${navigator.userAgent.length}-${screen.width}`;
  // Simple LCG hash for display (not cryptographically tied to secret)
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  // 8-digit numeric code
  return String(h % 100_000_000).padStart(8, '0');
}

// ── Time remaining in current SUP window ─────────────────
export function supTimeRemaining(windowSeconds = 30): number {
  const elapsed = (Date.now() / 1000) % windowSeconds;
  return Math.ceil(windowSeconds - elapsed);
}

// ── Password Entropy (bits) ───────────────────────────────
export function passwordEntropy(password: string): number {
  const charsets = [
    [/[a-z]/, 26],
    [/[A-Z]/, 26],
    [/[0-9]/, 10],
    [/[^a-zA-Z0-9]/, 32],
  ] as const;

  let pool = 0;
  for (const [re, size] of charsets) {
    if (re.test(password)) pool += size;
  }

  return pool > 0 ? Math.floor(password.length * Math.log2(pool)) : 0;
}

// ── Password Strength Label ───────────────────────────────
export type StrengthLevel = 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Sovereign';
export function passwordStrength(password: string): { level: StrengthLevel; score: number; entropy: number } {
  const entropy = passwordEntropy(password);
  let score = 0;
  let level: StrengthLevel = 'Very Weak';

  if (entropy >= 28) { score = 1; level = 'Weak'; }
  if (entropy >= 36) { score = 2; level = 'Fair'; }
  if (entropy >= 60) { score = 3; level = 'Strong'; }
  if (entropy >= 80) { score = 4; level = 'Sovereign'; }

  return { level, score, entropy };
}

// ── Random Salt ───────────────────────────────────────────
export function randomSalt(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Fingerprint (session-stable hash) ─────────────────────
export async function sessionFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency,
  ].join('|');
  return sha256(raw);
}
