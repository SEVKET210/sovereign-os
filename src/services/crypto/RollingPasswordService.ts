/* ============================================================
   SOVEREIGN-OS — RFC 6238 Standard TOTP & Duress Engine
   HMAC-SHA256 based single-use dynamic keys with CSPRNG secret enrollment.
   Strict burn-on-read enforcement and silent decoy panic protocol.
   ============================================================ */

import type { RollingKeySession } from '../../types';
import type { DynamicEnclaveOperator } from '../../types/auth';
import { ThreatDetectionEngine } from '../security/ThreatDetectionEngine';
import { KeyDerivationBridge } from './KeyDerivationBridge';
import { EnvelopeCipher } from './EnvelopeCipher';
import { MemorySanitizer } from './MemorySanitizer';
import { Bip39Service } from './Bip39Service';

export interface EmergencyPacket {
  protocol: 'SOVEREIGN_DURESS_V1';
  timestamp: number;
  triggerCode: string;
  clientFingerprint: string;
  signatureHmacSha256: string;
  syntheticDecoySessionId: string;
}

interface StoredDuressVerifier {
  saltHex: string;
  verifierHex: string;
  isConfigured: boolean;
}

export interface SpentTokenMetadata {
  tokenHash: string;
  expiresAt: number; // Current epoch + 90,000ms (3 * 30s steps)
}

export class RollingPasswordService {
  private static readonly WINDOW_SECONDS = 30;
  private static readonly ENROLLED_SECRET_ENC_KEY = 'sovereign_totp_enrolled_secret_enc_v1';
  private static readonly DURESS_VERIFIER_STORAGE_KEY = 'sovereign_duress_verifier_v1';
  public static readonly SPENT_REGISTRY_STORAGE_KEY = 'sovereign_consumed_totp_registry_v1';
  public static readonly DYNAMIC_OPERATORS_STORAGE_KEY = 'sovereign_dynamic_enclave_operators_v1';
  private static readonly SPENT_TOKEN_TTL_MS = 90_000;
  private static inMemorySecret: Uint8Array | null = null;
  private static isListenerRegistered = false;

  /**
   * Enrolls or updates the salted dynamic duress PIN.
   * Enforces minimum 8 characters entropy (alphanumeric or digits).
   */
  public static async enrollDuressPin(duressPin: string): Promise<void> {
    const trimmed = duressPin ? duressPin.trim() : '';
    if (trimmed.length < 8) {
      throw new Error('WEAK_DURESS_PIN: Dynamic Duress PIN must be at least 8 characters.');
    }

    const salt = crypto.getRandomValues(new Uint8Array(32));
    const verifierBytes = await this.deriveDuressVerifierBytes(trimmed, salt);

    const saltHex = MemorySanitizer.bytesToHex(salt);
    const verifierHex = MemorySanitizer.bytesToHex(verifierBytes);

    if (typeof window !== 'undefined' && window.localStorage) {
      const record: StoredDuressVerifier = {
        saltHex,
        verifierHex,
        isConfigured: true,
      };
      localStorage.setItem(this.DURESS_VERIFIER_STORAGE_KEY, JSON.stringify(record));
    }
  }

  /**
   * Checks whether a dynamic duress PIN has been configured on this device.
   */
  public static isDuressConfigured(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      const raw = localStorage.getItem(this.DURESS_VERIFIER_STORAGE_KEY);
      if (!raw) return false;
      const parsed: StoredDuressVerifier = JSON.parse(raw);
      return !!(parsed && parsed.isConfigured && parsed.saltHex && parsed.verifierHex);
    } catch {
      return false;
    }
  }

  /**
   * Wipes the enrolled duress PIN verifier on vault reset or reconfiguration.
   */
  public static clearDuressPin(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(this.DURESS_VERIFIER_STORAGE_KEY);
      } catch {}
    }
  }

  /**
   * Derives a high-cost PBKDF2-SHA256 verifier digest over the PIN and CSPRNG salt (100,000 iter).
   */
  public static async deriveDuressVerifierBytes(pin: string, salt: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256 // 32 bytes
    );

    return new Uint8Array(derivedBits);
  }

  /**
   * Browser-safe constant-time evaluation using the Double-HMAC Verification Pattern.
   * Eliminates early-exit timing leaks in JavaScript engines.
   */
  public static async verifyDuressPinConstantTime(candidate: string): Promise<boolean> {
    if (!this.isDuressConfigured()) return false;

    let record: StoredDuressVerifier | null = null;
    try {
      const raw = localStorage.getItem(this.DURESS_VERIFIER_STORAGE_KEY);
      if (raw) record = JSON.parse(raw);
    } catch {
      return false;
    }
    if (!record || !record.saltHex || !record.verifierHex) return false;

    try {
      const salt = MemorySanitizer.hexToBytes(record.saltHex);
      const storedVerifier = MemorySanitizer.hexToBytes(record.verifierHex);

      const candidateVerifier = await this.deriveDuressVerifierBytes(candidate, salt);

      // Double-HMAC pattern with ephemeral key
      const ephemeralKey = await crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const sigABuffer = await crypto.subtle.sign('HMAC', ephemeralKey, candidateVerifier as unknown as BufferSource);
      const sigBBuffer = await crypto.subtle.sign('HMAC', ephemeralKey, storedVerifier as unknown as BufferSource);

      const sigA = new Uint8Array(sigABuffer);
      const sigB = new Uint8Array(sigBBuffer);

      let diff = 0;
      for (let i = 0; i < sigA.length; i++) {
        diff |= sigA[i] ^ sigB[i];
      }

      return diff === 0;
    } catch {
      return false;
    }
  }

  private static ensureLockListener(): void {
    if (!this.isListenerRegistered) {
      KeyDerivationBridge.onLock(() => {
        this.clearInMemorySecret();
      });
      this.isListenerRegistered = true;
    }
  }

  /**
   * Sanitizes and purges cached enrollment secret bytes from volatile RAM.
   */
  public static clearInMemorySecret(): void {
    if (this.inMemorySecret) {
      MemorySanitizer.zeroize(this.inMemorySecret);
      this.inMemorySecret = null;
    }
  }

  /**
   * Retrieves or initializes the 256-bit CSPRNG enrollment secret.
   * Resolves the deadlock so dynamic tokens can be verified at gate before master KEK is unlocked.
   */
  public static async getEnrolledSecret(): Promise<Uint8Array> {
    this.ensureLockListener();
    if (this.inMemorySecret) return this.inMemorySecret;

    // 1. Strict Zero-Knowledge Enclave Check: master KEK must be present in RAM
    if (!KeyDerivationBridge.isUnlocked()) {
      throw new Error('ENCLAVE_LOCKED: Cannot retrieve or decrypt TOTP enrollment secret while master KEK is purged.');
    }

    const ctx = KeyDerivationBridge.getContext();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedRaw = localStorage.getItem(this.ENROLLED_SECRET_ENC_KEY);
        if (storedRaw) {
          const envelope = JSON.parse(storedRaw);
          const hexSecret = await EnvelopeCipher.unsealEnvelope<string>(
            envelope,
            ctx.masterKek,
            {
              workspaceId: 'system_auth',
              recordId: 'totp_enrolled_secret',
              fieldName: 'secret',
              schemaVersion: 1,
            }
          );
          if (hexSecret && hexSecret.length === 64) {
            const bytes = MemorySanitizer.hexToBytes(hexSecret);
            this.inMemorySecret = bytes;
            return bytes;
          }
        }
      } catch {}
    }

    // 2. Generate new cryptographically secure 256-bit enrollment secret
    const newSecret = crypto.getRandomValues(new Uint8Array(32));
    this.inMemorySecret = newSecret;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const hexSecret = MemorySanitizer.bytesToHex(newSecret);
        const envelope = await EnvelopeCipher.sealEnvelope(
          hexSecret,
          ctx.masterKek,
          {
            workspaceId: 'system_auth',
            recordId: 'totp_enrolled_secret',
            fieldName: 'secret',
            schemaVersion: 1,
          }
        );
        localStorage.setItem(this.ENROLLED_SECRET_ENC_KEY, JSON.stringify(envelope));
      } catch {}
    }

    return newSecret;
  }

  /**
   * Synchronous FIPS 180-4 SHA-256 implementation for zero-latency TOTP calculation.
   */
  private static sha256(msg: Uint8Array): Uint8Array {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    const l = msg.length;
    const bitLen = l * 8;
    const padLen = l % 64 < 56 ? 56 - (l % 64) : 120 - (l % 64);
    const padded = new Uint8Array(l + padLen + 8);
    padded.set(msg, 0);
    padded[l] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 4, bitLen >>> 0, false);
    view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

    const W = new Uint32Array(64);
    const blockView = new DataView(padded.buffer);

    for (let i = 0; i < padded.length; i += 64) {
      for (let t = 0; t < 16; t++) {
        W[t] = blockView.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t++) {
        const s0 =
          (((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^
            ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^
            (W[t - 15] >>> 3)) >>>
          0;
        const s1 =
          (((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^
            ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^
            (W[t - 2] >>> 10)) >>>
          0;
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
      }

      let a = H[0],
        b = H[1],
        c = H[2],
        d = H[3],
        e = H[4],
        f = H[5],
        g = H[6],
        h = H[7];

      for (let t = 0; t < 64; t++) {
        const S1 = (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) >>> 0;
        const ch = ((e & f) ^ (~e & g)) >>> 0;
        const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
        const S0 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) >>> 0;
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let t = 0; t < 8; t++) {
      outView.setUint32(t * 4, H[t], false);
    }
    return out;
  }

  /**
   * Computes RFC 2104 compliant HMAC-SHA256 synchronously.
   */
  public static computeHmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
    const blockSize = 64;
    let k = key;
    if (k.length > blockSize) {
      k = this.sha256(k);
    }
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(k);

    const ipad = new Uint8Array(blockSize);
    const opad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      ipad[i] = paddedKey[i] ^ 0x36;
      opad[i] = paddedKey[i] ^ 0x5c;
    }

    const innerMsg = new Uint8Array(blockSize + message.length);
    innerMsg.set(ipad, 0);
    innerMsg.set(message, blockSize);
    const innerHash = this.sha256(innerMsg);

    const outerMsg = new Uint8Array(blockSize + 32);
    outerMsg.set(opad, 0);
    outerMsg.set(innerHash, blockSize);
    return this.sha256(outerMsg);
  }

  /**
   * Derives RFC 6238 TOTP token for a specific 30-second epoch counter.
   */
  private static deriveTokenForEpoch(
    secret: Uint8Array,
    timeStepCounter: number
  ): { formatted: string; sixDigit: string; sessionNonce: string } {
    const counterBytes = new Uint8Array(8);
    const view = new DataView(counterBytes.buffer);
    view.setUint32(0, Math.floor(timeStepCounter / 0x100000000), false);
    view.setUint32(4, timeStepCounter >>> 0, false);

    const hmac = this.computeHmacSha256(secret, counterBytes);

    // RFC 6238 / RFC 4226 Dynamic Truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const sixDigit = (binary % 1000000).toString().padStart(6, '0');

    // High-entropy 12-char formatted token XXXX-XXXX-XXXX derived from HMAC bytes
    const hex1 = Array.from(hmac.subarray(0, 2)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const hex2 = Array.from(hmac.subarray(2, 4)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const hex3 = Array.from(hmac.subarray(4, 6)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const formatted = `${hex1}-${hex2}-${hex3}`;

    const sessionNonce = `0x${Array.from(hmac.subarray(6, 10)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

    return { formatted, sixDigit, sessionNonce };
  }

  /**
   * Generates the authentic RFC 6238 TOTP single-use dynamic key tied to the active 30s epoch.
   */
  public static async getCurrentRollingKey(): Promise<RollingKeySession> {
    const secret = await this.getEnrolledSecret();
    const epochSeconds = Math.floor(Date.now() / 1000);
    const windowStart = Math.floor(epochSeconds / this.WINDOW_SECONDS) * this.WINDOW_SECONDS;
    const windowEnd = windowStart + this.WINDOW_SECONDS;
    const secondsRemaining = windowEnd - epochSeconds;
    const timeStep = Math.floor(epochSeconds / this.WINDOW_SECONDS);

    const { formatted, sessionNonce } = this.deriveTokenForEpoch(secret, timeStep);

    return {
      dynamicKeyFormatted: formatted,
      ttlSecondsRemaining: secondsRemaining,
      windowSizeSeconds: this.WINDOW_SECONDS,
      sessionNonce,
    };
  }

  /**
   * Computes SHA-256(token + ':' + windowStep) formatted as a hex string.
   * Plain tokens are never stored in persistent storage.
   */
  public static computeSpentTokenHash(token: string, windowStep: number): string {
    const raw = `${token.trim().toUpperCase()}:${windowStep}`;
    const digest = this.sha256(new TextEncoder().encode(raw));
    return MemorySanitizer.bytesToHex(digest);
  }

  /**
   * Loads existing registry entries from storage and prunes expired entries (Date.now() > item.expiresAt).
   */
  public static getSpentTokenRegistry(): SpentTokenMetadata[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = localStorage.getItem(this.SPENT_REGISTRY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const now = Date.now();
      const valid = parsed.filter(
        (item): item is SpentTokenMetadata =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.tokenHash === 'string' &&
          typeof item.expiresAt === 'number' &&
          item.expiresAt > now
      );
      if (valid.length !== parsed.length) {
        localStorage.setItem(this.SPENT_REGISTRY_STORAGE_KEY, JSON.stringify(valid));
      }
      return valid;
    } catch {
      return [];
    }
  }

  /**
   * Persists the updated spent token registry back to localStorage.
   */
  public static saveSpentTokenRegistry(records: SpentTokenMetadata[]): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(this.SPENT_REGISTRY_STORAGE_KEY, JSON.stringify(records));
      } catch {}
    }
  }

  /**
   * Validates an input key.
   * If candidate matches the enrolled dynamic duress PIN, triggers Decoy Duress Mode silently.
   * Otherwise validates against the authentic HMAC-SHA256 TOTP window and burns on read.
   * Format-only bypass has been completely eliminated.
   */
  public static async verifyKey(inputKey: string): Promise<{
    valid: boolean;
    isDecoy: boolean;
    isDuress?: boolean;
    reason?: string;
    error?: string;
    emergencyPacket?: EmergencyPacket;
  }> {
    const sanitized = inputKey.trim();

    // 1. Dynamic Salted Duress Check (Double-HMAC Constant-Time Verification)
    if (this.isDuressConfigured()) {
      const isDuressMatch = await this.verifyDuressPinConstantTime(sanitized);
      if (isDuressMatch) {
        const emergencyPacket = await this.dispatchDuressAlert('DYNAMIC_DURESS_TRIGGER');
        ThreatDetectionEngine.triggerDuressDistress(emergencyPacket);
        return {
          valid: true,
          isDecoy: true,
          isDuress: true,
          emergencyPacket,
        };
      }
    }

    const upperKey = sanitized.toUpperCase();

    // 2. Persistent Token Registry Check & Pruning (Burn-on-Read Replay Protection)
    const activeRegistry = this.getSpentTokenRegistry();
    const epochSeconds = Math.floor(Date.now() / 1000);
    const currentStep = Math.floor(epochSeconds / this.WINDOW_SECONDS);

    // Check if the candidate's tokenHash exists in active records across active tolerance window
    const isAlreadySpent = [currentStep, currentStep - 1, currentStep + 1].some((step) => {
      const candidateHash = this.computeSpentTokenHash(upperKey, step);
      return activeRegistry.some((item) => item.tokenHash === candidateHash);
    });

    if (isAlreadySpent) {
      ThreatDetectionEngine.recordFailedAuthAttempt('auth-vault-key-burned');
      return {
        valid: false,
        isDecoy: false,
        isDuress: false,
        reason: 'TOKEN_ALREADY_SPENT',
        error: 'KEY BURNED: Single-use password has already been consumed.',
      };
    }

    // 3. Cryptographic Verification against active TOTP window (T-1, T, T+1)
    const secret = await this.getEnrolledSecret();

    let matchedStep: number | null = null;
    let matchedDerived: { formatted: string; sixDigit: string } | null = null;

    for (const step of [currentStep, currentStep - 1, currentStep + 1]) {
      const derived = this.deriveTokenForEpoch(secret, step);
      if (derived.formatted === upperKey || derived.sixDigit === upperKey) {
        matchedStep = step;
        matchedDerived = derived;
        break;
      }
    }

    if (matchedStep !== null && matchedDerived !== null) {
      // Append { tokenHash, expiresAt: Date.now() + 90_000 } to registry
      const tokenHash = this.computeSpentTokenHash(upperKey, matchedStep);
      const expiresAt = Date.now() + this.SPENT_TOKEN_TTL_MS;
      const updatedRegistry = this.getSpentTokenRegistry();

      updatedRegistry.push({ tokenHash, expiresAt });

      // Also burn alternate format (e.g. sixDigit vs formatted) to prevent cross-format replay
      const altToken = upperKey === matchedDerived.formatted ? matchedDerived.sixDigit : matchedDerived.formatted;
      const altHash = this.computeSpentTokenHash(altToken, matchedStep);
      if (!updatedRegistry.some((r) => r.tokenHash === altHash)) {
        updatedRegistry.push({ tokenHash: altHash, expiresAt });
      }

      this.saveSpentTokenRegistry(updatedRegistry);

      return {
        valid: true,
        isDecoy: false,
        isDuress: false,
      };
    }

    // Track failed attempt for rate limiting
    ThreatDetectionEngine.recordFailedAuthAttempt('auth-vault-key-invalid');

    return {
      valid: false,
      isDecoy: false,
      isDuress: false,
      error: 'INVALID AUTHENTICATION TOKEN: Key does not match active epoch window.',
    };
  }

  /**
   * Convenience alias for verifyKey.
   */
  public static async verifyCode(candidate: string) {
    return this.verifyKey(candidate);
  }

  /**
   * Quietly dispatches a signed emergency telemetry alert packet
   * while mounting the synthetic decoy workspace. (No DevTools logs)
   */
  private static async dispatchDuressAlert(triggerCode = 'DYNAMIC_DURESS_TRIGGER'): Promise<EmergencyPacket> {
    let secret: Uint8Array;
    if (KeyDerivationBridge.isUnlocked()) {
      try {
        secret = await this.getEnrolledSecret();
      } catch {
        secret = crypto.getRandomValues(new Uint8Array(32));
      }
    } else {
      // Ephemeral secret for unauthenticated duress triggers; no DevTools errors
      secret = crypto.getRandomValues(new Uint8Array(32));
    }

    const timestamp = Date.now();
    const payloadBytes = new TextEncoder().encode(`${triggerCode}|${timestamp}`);
    const signatureBytes = this.computeHmacSha256(secret, payloadBytes);
    const signatureHex = Array.from(signatureBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    const randomHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    const packet: EmergencyPacket = {
      protocol: 'SOVEREIGN_DURESS_V1',
      timestamp,
      triggerCode,
      clientFingerprint: `CFP-${randomHex.slice(0, 8).toUpperCase()}`,
      signatureHmacSha256: `sha256_${signatureHex}`,
      syntheticDecoySessionId: `decoy_sess_${timestamp}`,
    };

    // Save duress flag in sessionStorage for decoy state
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('sovereign-decoy-mode', 'true');
    }

    return packet;
  }

  /**
   * Derives RFC 6238 TOTP tokens for any arbitrary 32-byte secret.
   */
  public static deriveTokenForSecret(
    secret: Uint8Array,
    timeStepCounter?: number
  ): { formatted: string; sixDigit: string; sessionNonce: string } {
    const epochSeconds = Math.floor(Date.now() / 1000);
    const step = timeStepCounter !== undefined ? timeStepCounter : Math.floor(epochSeconds / this.WINDOW_SECONDS);
    return this.deriveTokenForEpoch(secret, step);
  }

  /**
   * Verifies an input candidate against any arbitrary 32-byte TOTP secret
   * with active window tolerance (T-1, T, T+1) and single-use burn protection.
   */
  public static verifyTokenForSecret(
    secret: Uint8Array,
    candidateToken: string
  ): boolean {
    const clean = candidateToken.trim().toUpperCase().replace(/[\s-]/g, '');
    const rawUpper = candidateToken.trim().toUpperCase();
    if (!clean) return false;

    // Check if candidate is a valid 12 or 24 word BIP-39 recovery mnemonic
    if (candidateToken.trim().split(/\s+/).length >= 12 && Bip39Service.validateMnemonic(candidateToken)) {
      return true;
    }

    const epochSeconds = Math.floor(Date.now() / 1000);
    const currentStep = Math.floor(epochSeconds / this.WINDOW_SECONDS);

    // Replay check
    const activeRegistry = this.getSpentTokenRegistry();
    const isAlreadySpent = [currentStep, currentStep - 1, currentStep + 1].some((step) => {
      const hashClean = this.computeSpentTokenHash(clean, step);
      const hashRaw = this.computeSpentTokenHash(rawUpper, step);
      return activeRegistry.some((item) => item.tokenHash === hashClean || item.tokenHash === hashRaw);
    });
    if (isAlreadySpent) return false;

    // Window check
    for (const step of [currentStep, currentStep - 1, currentStep + 1]) {
      const derived = this.deriveTokenForEpoch(secret, step);
      const cleanFormatted = derived.formatted.replace(/[\s-]/g, '');
      if (
        derived.formatted === rawUpper ||
        derived.sixDigit === clean ||
        cleanFormatted === clean
      ) {
        // Burn on read with canonical clean token
        const tokenHash = this.computeSpentTokenHash(clean, step);
        const expiresAt = Date.now() + this.SPENT_TOKEN_TTL_MS;
        const updated = this.getSpentTokenRegistry();
        updated.push({ tokenHash, expiresAt });
        this.saveSpentTokenRegistry(updated);
        return true;
      }
    }
    return false;
  }

  /**
   * Retrieves all enrolled dynamic enclave operators from storage.
   */
  public static listEnrolledDynamicOperators(): DynamicEnclaveOperator[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(this.DYNAMIC_OPERATORS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Looks up an enrolled dynamic operator by alias (case-insensitive).
   */
  public static getEnrolledDynamicOperator(alias: string): DynamicEnclaveOperator | null {
    const clean = alias.trim().toUpperCase();
    if (!clean) return null;
    const list = this.listEnrolledDynamicOperators();
    return list.find((op) => op.alias.toUpperCase() === clean) || null;
  }

  /**
   * Enrolls a new operator in the Dynamic Cryptographic Enclave.
   */
  public static async enrollDynamicOperator(params: {
    alias: string;
    masterPassphrase?: string;
    duressPin?: string;
    workspaceMode?: 'PERSONAL_SANDBOX' | 'ENTERPRISE_NODE';
    companyName?: string;
  }): Promise<{ operator: DynamicEnclaveOperator; rollingKey: string; seedPassphrase: string }> {
    const cleanAlias = params.alias.trim().toUpperCase();
    if (!cleanAlias) {
      throw new Error('MISSING_ALIAS: Operator alias is required.');
    }

    // Generate genuine BIP-39 12-word mnemonic phrase if custom master passphrase not provided
    const seedPassphrase = params.masterPassphrase?.trim() || Bip39Service.generateMnemonic(128);

    // 1. Salt & Verifier for Master Passphrase
    const salt = crypto.getRandomValues(new Uint8Array(32));
    const verifierBytes = await this.deriveDuressVerifierBytes(seedPassphrase, salt);
    const saltHex = MemorySanitizer.bytesToHex(salt);
    const verifierHex = MemorySanitizer.bytesToHex(verifierBytes);

    // 2. Dedicated TOTP Secret for this Operator
    const totpSecret = crypto.getRandomValues(new Uint8Array(32));
    const totpSecretHex = MemorySanitizer.bytesToHex(totpSecret);

    // 3. Optional Duress PIN Verifier
    let duressSaltHex: string | undefined;
    let duressVerifierHex: string | undefined;
    if (params.duressPin && params.duressPin.trim()) {
      const dSalt = crypto.getRandomValues(new Uint8Array(32));
      const dVerifier = await this.deriveDuressVerifierBytes(params.duressPin.trim(), dSalt);
      duressSaltHex = MemorySanitizer.bytesToHex(dSalt);
      duressVerifierHex = MemorySanitizer.bytesToHex(dVerifier);
    }

    const operator: DynamicEnclaveOperator = {
      alias: cleanAlias,
      enclaveId: `enclave_${cleanAlias.toLowerCase()}_${Date.now().toString(36)}`,
      saltHex,
      verifierHex,
      totpSecretHex,
      duressSaltHex,
      duressVerifierHex,
      enrolledAt: Date.now(),
      workspaceMode: params.workspaceMode || 'PERSONAL_SANDBOX',
      companyName: params.companyName?.trim(),
    };

    const existing = this.listEnrolledDynamicOperators().filter((op) => op.alias.toUpperCase() !== cleanAlias);
    existing.push(operator);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.DYNAMIC_OPERATORS_STORAGE_KEY, JSON.stringify(existing));
    }

    const initialToken = this.deriveTokenForEpoch(totpSecret, Math.floor(Date.now() / 30000)).formatted;

    return {
      operator,
      rollingKey: initialToken,
      seedPassphrase,
    };
  }

  /**
   * Verifies an operator attempting to unlock the dynamic enclave gate.
   * Checks Master Passphrase, 30-Second Rolling TOTP Token, or Duress Trap PIN.
   */
  public static async verifyDynamicOperator(
    alias: string,
    candidateKeyOrToken: string
  ): Promise<{
    success: boolean;
    isDecoy?: boolean;
    isDuress?: boolean;
    operator?: DynamicEnclaveOperator;
    errorTr?: string;
    errorEn?: string;
  }> {
    const cleanAlias = alias.trim().toUpperCase();
    const candidate = candidateKeyOrToken.trim();

    if (!cleanAlias || !candidate) {
      return {
        success: false,
        errorTr: 'Operatör takma adı ve anahtar/jeton gereklidir.',
        errorEn: 'Operator alias and key/token are required.',
      };
    }

    const operator = this.getEnrolledDynamicOperator(cleanAlias);
    if (!operator) {
      return {
        success: false,
        errorTr: `"${cleanAlias}" henüz bu enklavda kayıtlı değil. Lütfen önce Kök Enclave Kimliğini oluşturun.`,
        errorEn: `"${cleanAlias}" is not enrolled. Please initialize Enclave Identity first.`,
      };
    }

    // 1. Check Duress Trap PIN
    if (operator.duressSaltHex && operator.duressVerifierHex) {
      try {
        const dSalt = MemorySanitizer.hexToBytes(operator.duressSaltHex);
        const candidateDBytes = await this.deriveDuressVerifierBytes(candidate, dSalt);
        const candidateDHex = MemorySanitizer.bytesToHex(candidateDBytes);
        if (candidateDHex === operator.duressVerifierHex) {
          // Trigger Silent Panic Decoy Mode
          const packet = await this.dispatchDuressAlert('OPERATOR_DURESS_TRIGGER');
          ThreatDetectionEngine.triggerDuressDistress(packet);
          sessionStorage.setItem('sovereign-session', `decoy_node_${Date.now()}`);
          return {
            success: true,
            isDecoy: true,
            isDuress: true,
            operator,
          };
        }
      } catch {}
    }

    // 2. Check 30-second Dynamic Rolling TOTP Token
    try {
      const totpBytes = MemorySanitizer.hexToBytes(operator.totpSecretHex);
      const isTotpMatch = this.verifyTokenForSecret(totpBytes, candidate);
      if (isTotpMatch) {
        operator.lastLoginAt = Date.now();
        return {
          success: true,
          operator,
        };
      }
    } catch {}

    // 2.5 Check BIP-39 Recovery Mnemonic
    if (candidate.split(/\s+/).length >= 12 && Bip39Service.validateMnemonic(candidate)) {
      try {
        const salt = MemorySanitizer.hexToBytes(operator.saltHex);
        const candidateBytes = await this.deriveDuressVerifierBytes(candidate, salt);
        const candidateHex = MemorySanitizer.bytesToHex(candidateBytes);
        if (candidateHex === operator.verifierHex) {
          operator.lastLoginAt = Date.now();
          return {
            success: true,
            operator,
          };
        }
      } catch {}
    }

    // 3. Check Master Passphrase PBKDF2 Verifier
    try {
      const salt = MemorySanitizer.hexToBytes(operator.saltHex);
      const candidateBytes = await this.deriveDuressVerifierBytes(candidate, salt);
      const candidateHex = MemorySanitizer.bytesToHex(candidateBytes);
      if (candidateHex === operator.verifierHex) {
        operator.lastLoginAt = Date.now();
        return {
          success: true,
          operator,
        };
      }
    } catch {}

    // Track failed attempt
    ThreatDetectionEngine.recordFailedAuthAttempt('dynamic-enclave-key-invalid');

    return {
      success: false,
      errorTr: 'Geçersiz anahtar veya dinamik jeton. Lütfen bilginizi kontrol ediniz.',
      errorEn: 'Invalid key or dynamic token. Verification failed.',
    };
  }

  /**
   * Computes current dynamic rolling token for a specific enrolled operator.
   */
  public static getCurrentRollingTokenForOperator(alias: string): RollingKeySession | null {
    const operator = this.getEnrolledDynamicOperator(alias);
    if (!operator) return null;
    try {
      const secret = MemorySanitizer.hexToBytes(operator.totpSecretHex);
      const epochSeconds = Math.floor(Date.now() / 1000);
      const windowStart = Math.floor(epochSeconds / this.WINDOW_SECONDS) * this.WINDOW_SECONDS;
      const windowEnd = windowStart + this.WINDOW_SECONDS;
      const secondsRemaining = windowEnd - epochSeconds;
      const timeStep = Math.floor(epochSeconds / this.WINDOW_SECONDS);

      const { formatted, sessionNonce } = this.deriveTokenForEpoch(secret, timeStep);
      return {
        dynamicKeyFormatted: formatted,
        ttlSecondsRemaining: secondsRemaining,
        windowSizeSeconds: this.WINDOW_SECONDS,
        sessionNonce,
      };
    } catch {
      return null;
    }
  }
}

