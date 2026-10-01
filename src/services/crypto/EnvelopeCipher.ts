/* ============================================================
   SOVEREIGN-OS — Field-Level Envelope Encryption (FLEE) Cipher
   Multi-tier envelope encryption with Cryptographic Binding Context (AAD):
   - Per-record ephemeral 256-bit AES-GCM Data Encryption Key (DEK)
   - Authenticated AEAD context binding (ws, rec, fld, v)
   - Dynamic DEK wrapped via ephemeral Master Key Encryption Key (KEK)
   - Immediate RAM zeroization of plaintext buffers & DEK material
   ============================================================ */

import { MemorySanitizer } from './MemorySanitizer';
import type { EncryptedEnvelope } from '../../types';

export interface CryptographicBindingContext {
  workspaceId: string;
  recordId: string;
  fieldName: string;
  schemaVersion: number;
}

export class EnvelopeCipher {
  private static readonly ENVELOPE_VERSION = 1;
  private static readonly GCM_TAG_LENGTH = 128; // 16 bytes authentication tag

  /**
   * Canonical serialization helper for AEAD Associated Data (AAD).
   * Exact canonical format: ws:${context.workspaceId}|rec:${context.recordId}|fld:${context.fieldName}|v:${context.schemaVersion}
   */
  public static deriveAad(context: CryptographicBindingContext | Uint8Array | string): Uint8Array {
    if (!context) {
      throw new Error('AAD_CONTEXT_REQUIRED: Active cryptographic binding context is required.');
    }
    if (context instanceof Uint8Array) {
      return context;
    }
    if (typeof context === 'string') {
      return new TextEncoder().encode(context);
    }
    if (
      typeof context === 'object' &&
      'workspaceId' in context &&
      'recordId' in context &&
      'fieldName' in context &&
      'schemaVersion' in context
    ) {
      const canonical = `ws:${context.workspaceId}|rec:${context.recordId}|fld:${context.fieldName}|v:${context.schemaVersion}`;
      return new TextEncoder().encode(canonical);
    }
    throw new Error('MALFORMED_AAD_CONTEXT: Invalid CryptographicBindingContext structure.');
  }

  /**
   * Encrypts an arbitrary payload into a zero-knowledge EncryptedEnvelope
   * bound cryptographically to its operational context via AEAD Associated Data (AAD).
   *
   * 1. Derives canonical AAD from context.
   * 2. Generates ephemeral 256-bit AES-GCM DEK.
   * 3. Encrypts JSON serialized payload with 96-bit nonce and additionalData.
   * 4. Wraps DEK using Master KEK.
   * 5. Zeroizes raw buffer allocations in volatile memory.
   */
  public static async sealEnvelope<T>(
    payload: T,
    masterKek: CryptoKey,
    context: CryptographicBindingContext | Uint8Array | string
  ): Promise<EncryptedEnvelope> {
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(JSON.stringify(payload));
    const aadBytes = this.deriveAad(context);

    // 1. Generate ephemeral 256-bit DEK
    const dek = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // Extractable only for immediate wrapping
      ['encrypt', 'decrypt']
    );

    // 2. 96-bit (12-byte) high-entropy IV for payload
    const payloadIv = crypto.getRandomValues(new Uint8Array(12));

    // 3. Encrypt payload with DEK and enforce AAD binding
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: payloadIv as unknown as BufferSource,
        additionalData: aadBytes as unknown as BufferSource,
        tagLength: this.GCM_TAG_LENGTH,
      },
      dek,
      payloadBytes as unknown as BufferSource
    );

    // In AES-GCM Web Crypto, the last 16 bytes of encryptedBuffer is the authentication tag
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const tagStart = encryptedBytes.length - 16;
    const ciphertextBytes = encryptedBytes.slice(0, tagStart);
    const authTagBytes = encryptedBytes.slice(tagStart);

    // 4. Wrap DEK using Master KEK
    const wrapIv = crypto.getRandomValues(new Uint8Array(12));
    const wrappedDekBuffer = await crypto.subtle.wrapKey(
      'raw',
      dek,
      masterKek,
      {
        name: 'AES-GCM',
        iv: wrapIv as unknown as BufferSource,
        tagLength: this.GCM_TAG_LENGTH,
      }
    );

    // Combine wrapIv (12 bytes) + wrappedDekBuffer for deterministic self-contained unwrapping
    const wrappedDekBytesWithIv = new Uint8Array(wrapIv.length + wrappedDekBuffer.byteLength);
    wrappedDekBytesWithIv.set(wrapIv, 0);
    wrappedDekBytesWithIv.set(new Uint8Array(wrappedDekBuffer), wrapIv.length);

    try {
      const isStructured = typeof context === 'object' && !(context instanceof Uint8Array);
      return {
        v: this.ENVELOPE_VERSION,
        nonce: MemorySanitizer.bytesToHex(payloadIv),
        wrapped_dek: MemorySanitizer.bytesToHex(wrappedDekBytesWithIv),
        auth_tag: MemorySanitizer.bytesToHex(authTagBytes),
        ciphertext: MemorySanitizer.bytesToHex(ciphertextBytes),
        timestamp: Date.now(),
        ...(isStructured
          ? {
              record_id: (context as CryptographicBindingContext).recordId,
              field_name: (context as CryptographicBindingContext).fieldName,
              schema_version: (context as CryptographicBindingContext).schemaVersion,
            }
          : {}),
      };
    } finally {
      // Zeroize intermediate raw byte allocations
      MemorySanitizer.zeroize(payloadBytes);
      MemorySanitizer.zeroize(encryptedBytes);
      MemorySanitizer.zeroize(wrappedDekBytesWithIv);
    }
  }

  /**
   * Unwraps and decrypts an EncryptedEnvelope back into typed payload in volatile RAM,
   * verifying cryptographic context binding via AEAD Associated Data (AAD).
   */
  public static async unsealEnvelope<T>(
    envelope: EncryptedEnvelope,
    masterKek: CryptoKey,
    context: CryptographicBindingContext | Uint8Array | string
  ): Promise<T> {
    return this.openEnvelope<T>(envelope, masterKek, context);
  }

  /**
   * Primary open / unseal implementation enforcing AAD context check.
   */
  public static async openEnvelope<T>(
    envelope: EncryptedEnvelope,
    masterKek: CryptoKey,
    context: CryptographicBindingContext | Uint8Array | string
  ): Promise<T> {
    if (!envelope || envelope.v !== this.ENVELOPE_VERSION) {
      throw new Error(`UNSUPPORTED_ENVELOPE_VERSION: Version ${envelope?.v} is invalid.`);
    }

    const aadBytes = this.deriveAad(context);

    const wrappedDekWithIv = MemorySanitizer.hexToBytes(envelope.wrapped_dek);
    if (wrappedDekWithIv.length < 28) {
      throw new Error('MALFORMED_WRAPPED_DEK: Insufficient byte length for IV and wrapped key.');
    }

    const wrapIv = wrappedDekWithIv.slice(0, 12);
    const wrappedKeyBytes = wrappedDekWithIv.slice(12);

    let dek: CryptoKey;
    try {
      // 1. Unwrap ephemeral DEK
      dek = await crypto.subtle.unwrapKey(
        'raw',
        wrappedKeyBytes as unknown as BufferSource,
        masterKek,
        {
          name: 'AES-GCM',
          iv: wrapIv as unknown as BufferSource,
          tagLength: this.GCM_TAG_LENGTH,
        },
        { name: 'AES-GCM', length: 256 },
        false, // Non-extractable in memory
        ['decrypt']
      );
    } catch {
      throw new Error('DEK_UNWRAP_FAILED: Master KEK failed to authenticate wrapped Data Encryption Key.');
    } finally {
      MemorySanitizer.zeroize(wrappedDekWithIv);
    }

    const payloadIv = MemorySanitizer.hexToBytes(envelope.nonce);
    const ciphertextBytes = MemorySanitizer.hexToBytes(envelope.ciphertext);
    const authTagBytes = MemorySanitizer.hexToBytes(envelope.auth_tag);

    // Reassemble ciphertext + tag for Web Crypto Subtle AES-GCM
    const fullCiphertext = new Uint8Array(ciphertextBytes.length + authTagBytes.length);
    fullCiphertext.set(ciphertextBytes, 0);
    fullCiphertext.set(authTagBytes, ciphertextBytes.length);

    let decryptedBuffer: ArrayBuffer;
    try {
      decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: payloadIv as unknown as BufferSource,
          additionalData: aadBytes as unknown as BufferSource,
          tagLength: this.GCM_TAG_LENGTH,
        },
        dek,
        fullCiphertext as unknown as BufferSource
      );
    } catch (err) {
      const opErr = new Error(
        `CIPHERTEXT_INTEGRITY_VIOLATION: GCM authentication tag verification failed (${err instanceof Error ? err.message : String(err)}).`
      );
      opErr.name = 'OperationError';
      throw opErr;
    } finally {
      MemorySanitizer.zeroize(payloadIv);
      MemorySanitizer.zeroize(ciphertextBytes);
      MemorySanitizer.zeroize(authTagBytes);
      MemorySanitizer.zeroize(fullCiphertext);
    }

    const decryptedBytes = new Uint8Array(decryptedBuffer);
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBytes);

    try {
      return JSON.parse(jsonString) as T;
    } finally {
      MemorySanitizer.zeroize(decryptedBytes);
    }
  }

  /**
   * Field-level convenience wrapper for string/object field encryption with AAD binding.
   */
  public static async encryptField<T>(
    payload: T,
    masterKek: CryptoKey,
    context: CryptographicBindingContext | Uint8Array | string
  ): Promise<EncryptedEnvelope> {
    return this.sealEnvelope<T>(payload, masterKek, context);
  }

  /**
   * Field-level convenience wrapper for string/object field decryption with AAD binding.
   */
  public static async decryptField<T>(
    envelope: EncryptedEnvelope,
    masterKek: CryptoKey,
    context: CryptographicBindingContext | Uint8Array | string
  ): Promise<T> {
    return this.openEnvelope<T>(envelope, masterKek, context);
  }
}
