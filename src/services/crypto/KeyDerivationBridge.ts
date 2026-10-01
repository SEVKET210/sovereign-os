/* ============================================================
   SOVEREIGN-OS — Key Derivation Bridge & Enclave Root Authority
   WebAuthn PRF Hardware Seed with PBKDF2-SHA256 (310,000 iter) Fallback
   Manages volatile ephemeral Master Key Encryption Key (KEK)
   ============================================================ */

import { MemorySanitizer } from './MemorySanitizer';
import type { WorkspaceCryptoContext } from '../../types';

export class KeyDerivationBridge {
  private static activeContext: WorkspaceCryptoContext | null = null;
  private static readonly PBKDF2_ITERATIONS = 310000;
  private static readonly WORKSPACE_SALT_PREFIX = 'sovereign_workspace_salt_v1_';
  private static lockListeners: Array<() => void> = [];

  /**
   * Registers a listener to be called when the enclave context is locked and purged.
   */
  public static onLock(listener: () => void): () => void {
    this.lockListeners.push(listener);
    return () => {
      this.lockListeners = this.lockListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Generates or retrieves a unique 32-byte CSPRNG random salt per workspace.
   * Stored alongside workspace metadata to prevent precomputation / rainbow-table attacks.
   */
  public static getOrCreateWorkspaceSalt(workspaceIdentifier: string): Uint8Array {
    const storageKey = `${this.WORKSPACE_SALT_PREFIX}${workspaceIdentifier}`;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedHex = localStorage.getItem(storageKey);
        if (storedHex && storedHex.length === 64) {
          return MemorySanitizer.hexToBytes(storedHex);
        }
      } catch {}
    }

    // Generate 32-byte CSPRNG salt
    const randomSalt = crypto.getRandomValues(new Uint8Array(32));
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(storageKey, MemorySanitizer.bytesToHex(randomSalt));
      } catch {}
    }
    return randomSalt;
  }

  /**
   * Derives or restores the ephemeral WorkspaceCryptoContext.
   */
  public static async initializeContext(
    workspaceIdentifier: string,
    passphrase?: string,
    preferWebAuthn = true,
    explicitSalt?: Uint8Array
  ): Promise<WorkspaceCryptoContext> {
    if (this.activeContext && this.activeContext.workspaceId === workspaceIdentifier) {
      return this.activeContext;
    }

    let rawSeed: Uint8Array | null = null;
    let authMethod: 'WEBAUTHN_PRF' | 'PBKDF2_310K' = 'PBKDF2_310K';

    // 1. Attempt Hardware WebAuthn PRF Extension if preferred & available
    if (preferWebAuthn && typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        rawSeed = await this.deriveWebAuthnPrfSeed(workspaceIdentifier);
        if (rawSeed) {
          authMethod = 'WEBAUTHN_PRF';
        }
      } catch {
        // Fallback gracefully to passphrase PBKDF2
      }
    }

    // 2. Fallback to PBKDF2-SHA256 @ 310,000 iterations (Strict validation: minimum 12 chars)
    if (!rawSeed) {
      if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length < 12) {
        throw new Error('WEAK_OR_MISSING_PASSPHRASE: Master passphrase must be at least 12 characters.');
      }
      rawSeed = await this.derivePbkdf2Seed(passphrase.trim(), workspaceIdentifier, explicitSalt);
      authMethod = 'PBKDF2_310K';
    }

    try {
      // 3. Derive Ephemeral Master Key Encryption Key (KEK) [AES-GCM / 256-bit]
      const masterKek = await crypto.subtle.importKey(
        'raw',
        rawSeed as unknown as BufferSource,
        { name: 'AES-GCM', length: 256 },
        false, // Non-extractable from RAM
        ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
      );

      // 3.1 Derive Ephemeral Master Key Wrap Key (AES-KW / 256-bit) for 40B quantum DEK wrapping
      const masterKwKey = await crypto.subtle.importKey(
        'raw',
        rawSeed as unknown as BufferSource,
        { name: 'AES-KW', length: 256 },
        false, // Non-extractable from RAM
        ['wrapKey', 'unwrapKey']
      );

      // 4. Derive deterministic Blind Salt (HMAC search salt)
      const blindSalt = await this.deriveDeterministicBlindSalt(rawSeed);

      // 5. Compute single-direction SHA-256 workspace token hash
      const workspaceTokenHash = await this.computeWorkspaceTokenHash(workspaceIdentifier);

      this.activeContext = {
        workspaceId: workspaceIdentifier,
        workspaceTokenHash,
        masterKek,
        masterKwKey,
        blindSalt,
        authMethod,
        initializedAt: Date.now(),
      };

      return this.activeContext;
    } finally {
      // Zeroize the raw seed bytes immediately
      MemorySanitizer.zeroize(rawSeed);
    }
  }

  /**
   * Retrieves active unlocked crypto context or throws if locked.
   */
  public static getContext(): WorkspaceCryptoContext {
    if (!this.activeContext) {
      throw new Error('SOVEREIGN_ENCLAVE_LOCKED: Cryptographic context not initialized or locked in memory.');
    }
    return this.activeContext;
  }

  /**
   * Checks if the enclave is unlocked.
   */
  public static isUnlocked(): boolean {
    return this.activeContext !== null;
  }

  /**
   * Locks the enclave and purges Master KEK references from memory.
   */
  public static lockContext(): void {
    if (this.activeContext) {
      MemorySanitizer.zeroize(this.activeContext.blindSalt);
      this.activeContext = null;
    }
    for (const listener of this.lockListeners) {
      try {
        listener();
      } catch {}
    }
  }

  /**
   * Hardware WebAuthn PRF (Pseudo-Random Function) Extension Key Derivation.
   */
  private static async deriveWebAuthnPrfSeed(workspaceIdentifier: string): Promise<Uint8Array | null> {
    if (!navigator.credentials) return null;

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const prfInput = new TextEncoder().encode(`SOVEREIGN_PRF_INPUT_${workspaceIdentifier}`);

    // Request WebAuthn with PRF extension
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 10000,
        userVerification: 'preferred',
        extensions: {
          prf: {
            eval: {
              first: prfInput,
            },
          },
        } as unknown as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential & { getClientExtensionResults?: () => { prf?: { results?: { first?: ArrayBuffer } } } };

    if (!credential || !credential.getClientExtensionResults) return null;
    const extensions = credential.getClientExtensionResults();
    const prfResult = extensions?.prf?.results?.first;

    if (prfResult) {
      return new Uint8Array(prfResult as ArrayBuffer);
    }

    return null;
  }

  /**
   * PBKDF2-SHA256 with 310,000 iterations over 32-byte CSPRNG workspace salt.
   */
  private static async derivePbkdf2Seed(
    passphrase: string,
    workspaceIdentifier: string,
    explicitSalt?: Uint8Array
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const salt = explicitSalt || this.getOrCreateWorkspaceSalt(workspaceIdentifier);

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as unknown as BufferSource,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      256 // 32 bytes
    );

    return new Uint8Array(derivedBits);
  }

  /**
   * Derives a deterministic 32-byte blind index salt from the root seed via HKDF/SHA-256.
   */
  private static async deriveDeterministicBlindSalt(rootSeed: Uint8Array): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw',
      rootSeed as unknown as BufferSource,
      { name: 'HKDF' },
      false,
      ['deriveBits']
    );

    const blindBits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: encoder.encode('SOVEREIGN_BLIND_SEARCH_SALT_V1'),
        info: encoder.encode('BLIND_INDEX_DETERMINISTIC_SALT'),
      },
      baseKey,
      256 // 32 bytes
    );

    return new Uint8Array(blindBits);
  }

  /**
   * Single-direction SHA-256 digest of workspace access identifier.
   */
  public static async computeWorkspaceTokenHash(workspaceIdentifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`SOVEREIGN_WORKSPACE_HASH_${workspaceIdentifier}`)
    );
    return MemorySanitizer.bytesToHex(new Uint8Array(hashBuffer));
  }
}
