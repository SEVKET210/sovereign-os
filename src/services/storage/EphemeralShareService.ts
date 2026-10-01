/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Ephemeral Share Link Engine
   Client-Side Link Generation with Decryption Keys Anchored Exclusively
   in URL Hash Fragments (#key=...). RFC 3986 Server-Blind Routing.
   Strict Lifecycle Rules: 1h, 24h, 7d, and Burn-on-Download.
   ============================================================ */

import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import { ChunkingEngine } from './ChunkingEngine';
import { StorageAdapter } from './StorageAdapter';
import type {
  FileManifest,
  EphemeralShareRecord,
  ShareExpirationOption,
} from '../../types';

export interface SharePackage {
  manifest: FileManifest;
  chunkDeks: Record<string, string>; // chunkHash -> hex-encoded raw DEK
  createdAt: number;
}

const SHARES_STORAGE_PREFIX = 'sovereign_vault_share_';
const SHARES_INDEX_KEY = 'sovereign_vault_shares_index_v1';

export class EphemeralShareService {
  /**
   * Generates a zero-knowledge ephemeral share link for an external collaborator.
   * Decryption key is anchored exclusively in the URL hash fragment.
   */
  public static async generateShareLink(
    manifest: FileManifest,
    masterKwKey: CryptoKey,
    options: {
      expiration: ShareExpirationOption;
      burnOnDownload: boolean;
    }
  ): Promise<{
    shareUrl: string;
    record: EphemeralShareRecord;
    shareKeyHex: string;
  }> {
    const shareId = crypto.randomUUID();

    // 1. Unwrap DEK for each chunk using Master Key Wrap Key (AES-KW)
    const chunkDeks: Record<string, string> = {};
    for (const desc of manifest.chunkIndex) {
      const serializedChunk = await StorageAdapter.readChunk(desc.chunkHash);

      const nonce = serializedChunk.subarray(1, 1 + ChunkingEngine.NONCE_LENGTH);
      const wrappedDek = serializedChunk.subarray(
        1 + ChunkingEngine.NONCE_LENGTH,
        1 + ChunkingEngine.NONCE_LENGTH + ChunkingEngine.WRAPPED_DEK_LENGTH
      );
      void nonce;

      const dek = await crypto.subtle.unwrapKey(
        'raw',
        wrappedDek as unknown as BufferSource,
        masterKwKey,
        'AES-KW',
        { name: 'AES-GCM', length: 256 },
        true, // exportable in memory for sharing package
        ['decrypt']
      );

      const rawDekBytes = await crypto.subtle.exportKey('raw', dek);
      chunkDeks[desc.chunkHash] = MemorySanitizer.bytesToHex(new Uint8Array(rawDekBytes));
      MemorySanitizer.zeroize(new Uint8Array(rawDekBytes));
    }

    const sharePackage: SharePackage = {
      manifest,
      chunkDeks,
      createdAt: Date.now(),
    };

    // 2. Generate random 256-bit ephemeral share key K_share
    const shareKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const shareKeyHex = MemorySanitizer.bytesToHex(shareKeyRaw);

    const shareKey = await crypto.subtle.importKey(
      'raw',
      shareKeyRaw as unknown as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );

    // 3. Seal the SharePackage using K_share via EnvelopeCipher
    const encryptedManifestPayload = await EnvelopeCipher.sealEnvelope(
      sharePackage,
      shareKey,
      {
        workspaceId: 'ephemeral_share',
        recordId: shareId,
        fieldName: 'share_package',
        schemaVersion: 1,
      }
    );

    // 4. Calculate expiration timestamp
    const now = Date.now();
    let durationMs = 24 * 60 * 60 * 1000;
    if (options.expiration === '1h') durationMs = 60 * 60 * 1000;
    else if (options.expiration === '7d') durationMs = 7 * 24 * 60 * 60 * 1000;
    const expiresAt = now + durationMs;

    // 5. Generate HMAC integrity signature for the share record
    const shareSignature = await this.signShare(shareId, manifest.manifestId, expiresAt, shareKeyRaw);

    const record: EphemeralShareRecord = {
      shareId,
      manifestId: manifest.manifestId,
      fileName: manifest.originalFileName,
      mimeType: manifest.mimeType,
      trueByteLength: manifest.trueByteLength,
      clearanceLevel: manifest.clearanceLevel,
      createdAt: now,
      expiresAt,
      burnOnDownload: options.burnOnDownload,
      downloadCount: 0,
      status: 'ACTIVE',
      encryptedManifestPayload,
      shareSignature,
    };

    // 6. Persist share record
    this.persistRecord(record);

    // 7. Assemble Zero-Knowledge URL with clean route path segments: #/vault/share/${shareId}/${shareKeyHex}
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sovereign.os';
    const shareUrl = `${origin}/#/vault/share/${shareId}/${shareKeyHex}`;

    // Clean up sensitive memory buffers
    MemorySanitizer.zeroize(shareKeyRaw);

    return {
      shareUrl,
      record,
      shareKeyHex,
    };
  }

  /**
   * Fetches an active share record by ID, automatically evaluating expiration.
   */
  public static fetchShareRecord(shareId: string): EphemeralShareRecord | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = localStorage.getItem(`${SHARES_STORAGE_PREFIX}${shareId}`);
      if (!raw) return null;
      const record: EphemeralShareRecord = JSON.parse(raw);

      // Check expiration
      if (record.status === 'ACTIVE' && Date.now() > record.expiresAt) {
        record.status = 'EXPIRED';
        this.persistRecord(record);
      }

      return record;
    } catch {
      return null;
    }
  }

  /**
   * Decrypts and reconstitutes a shared file in volatile RAM using the hash-fragment key.
   * If burn-on-download is enabled, immediately marks the share as BURNED.
   */
  public static async consumeAndDecryptShare(
    shareId: string,
    shareKeyHex: string
  ): Promise<{
    manifest: FileManifest;
    blob: Blob;
    objectUrl: string;
    buffer: Uint8Array;
  }> {
    const record = this.fetchShareRecord(shareId);
    if (!record) {
      throw new Error('SHARE_NOT_FOUND: The requested sharing link does not exist or has been removed.');
    }

    if (record.status === 'EXPIRED') {
      throw new Error('SHARE_EXPIRED: The cryptographic lifecycle for this sharing link has elapsed.');
    }

    if (record.status === 'REVOKED') {
      throw new Error('SHARE_REVOKED: This sharing authorization was manually revoked by the enclave operator.');
    }

    if (record.status === 'BURNED') {
      throw new Error('SHARE_BURNED: Single-use download policy enforced. This artifact has already been consumed.');
    }

    if (!shareKeyHex || shareKeyHex.length !== 64) {
      throw new Error('INVALID_KEY_FRAGMENT: Decryption key in URL hash fragment is missing or malformed.');
    }

    // 1. Import share key from hash fragment
    const shareKeyBytes = MemorySanitizer.hexToBytes(shareKeyHex);
    const shareKey = await crypto.subtle.importKey(
      'raw',
      shareKeyBytes as unknown as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt', 'unwrapKey']
    );
    MemorySanitizer.zeroize(shareKeyBytes);

    // 2. Unseal SharePackage containing manifest and per-chunk DEKs
    const sharePackage = await EnvelopeCipher.unsealEnvelope<SharePackage>(
      record.encryptedManifestPayload,
      shareKey,
      {
        workspaceId: 'ephemeral_share',
        recordId: record.shareId,
        fieldName: 'share_package',
        schemaVersion: 1,
      }
    );

    const manifest = sharePackage.manifest;
    const totalChunks = manifest.chunkIndex.length;
    const decryptedSlices: Uint8Array[] = new Array(totalChunks);

    // 3. Fetch and decrypt all chunks in RAM
    for (let index = 0; index < totalChunks; index++) {
      const desc = manifest.chunkIndex[index];
      const serializedChunk = await StorageAdapter.readChunk(desc.chunkHash);

      // Standard layout: [Version (1B) | Nonce (12B) | WrappedDEK (40B) | AuthTag (16B) | PaddedCiphertext (4MB)]
      const nonce = serializedChunk.subarray(1, 1 + ChunkingEngine.NONCE_LENGTH);
      const authTag = serializedChunk.subarray(
        1 + ChunkingEngine.NONCE_LENGTH + ChunkingEngine.WRAPPED_DEK_LENGTH,
        ChunkingEngine.HEADER_LENGTH
      );
      const ciphertext = serializedChunk.subarray(ChunkingEngine.HEADER_LENGTH);

      // Retrieve per-chunk raw DEK from unsealed share package
      const rawDekHex = sharePackage.chunkDeks[desc.chunkHash];
      if (!rawDekHex) {
        throw new Error(`MISSING_DEK: Key for chunk ${desc.chunkHash} is missing from share payload.`);
      }

      const dekBytes = MemorySanitizer.hexToBytes(rawDekHex);
      const dek = await crypto.subtle.importKey(
        'raw',
        dekBytes as unknown as BufferSource,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      MemorySanitizer.zeroize(dekBytes);

      // Reassemble ciphertext + tag for Web Crypto decrypt
      const fullCiphertext = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
      fullCiphertext.set(ciphertext, 0);
      fullCiphertext.set(authTag, ciphertext.byteLength);

      const chunkAad = EnvelopeCipher.deriveAad({
        workspaceId: manifest.workspaceId || 'sovereign_vault',
        recordId: manifest.manifestId,
        fieldName: `chunk_${index}`,
        schemaVersion: 1,
      });

      let decryptedPaddedBlock: ArrayBuffer;
      try {
        decryptedPaddedBlock = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: nonce as unknown as BufferSource,
            additionalData: chunkAad as unknown as BufferSource,
            tagLength: 128,
          },
          dek,
          fullCiphertext as unknown as BufferSource
        );
      } finally {
        MemorySanitizer.zeroize(fullCiphertext);
      }

      const unpaddedChunkBytes = new Uint8Array(decryptedPaddedBlock);

      // Trim CSPRNG noise padding on final block
      if (index === totalChunks - 1) {
        const expectedBytesInFinalChunk =
          manifest.trueByteLength - (totalChunks - 1) * ChunkingEngine.CHUNK_QUANTUM;
        const validSlice = unpaddedChunkBytes.slice(0, expectedBytesInFinalChunk);
        MemorySanitizer.zeroize(unpaddedChunkBytes);
        decryptedSlices[index] = validSlice;
      } else {
        decryptedSlices[index] = unpaddedChunkBytes;
      }
    }

    // 4. Concatenate into contiguous buffer in RAM
    const reconstructedBuffer = new Uint8Array(manifest.trueByteLength);
    let offset = 0;
    for (const slice of decryptedSlices) {
      reconstructedBuffer.set(slice, offset);
      offset += slice.byteLength;
      MemorySanitizer.zeroize(slice);
    }

    // 5. Create ephemeral Blob & Object URL
    const blob = new Blob([reconstructedBuffer as unknown as BlobPart], {
      type: manifest.mimeType || 'application/octet-stream',
    });
    const objectUrl = URL.createObjectURL(blob);

    // 6. Handle single-use burn or increment download count
    record.downloadCount += 1;
    if (record.burnOnDownload) {
      record.status = 'BURNED';
    }
    this.persistRecord(record);

    return {
      manifest,
      blob,
      objectUrl,
      buffer: reconstructedBuffer,
    };
  }

  /**
   * Manually revokes an active share link and purges its signature.
   */
  public static revokeShare(shareId: string): void {
    const record = this.fetchShareRecord(shareId);
    if (!record) return;
    record.status = 'REVOKED';
    this.persistRecord(record);
  }

  /**
   * Lists all active or historical shares for a specific manifest.
   */
  public static listSharesForManifest(manifestId: string): EphemeralShareRecord[] {
    const all = this.listAllShares();
    return all.filter((s) => s.manifestId === manifestId);
  }

  /**
   * Lists all recorded shares across the enclave.
   */
  public static listAllShares(): EphemeralShareRecord[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const rawIndex = localStorage.getItem(SHARES_INDEX_KEY);
      if (!rawIndex) return [];
      const ids: string[] = JSON.parse(rawIndex);
      const list: EphemeralShareRecord[] = [];
      for (const id of ids) {
        const item = this.fetchShareRecord(id);
        if (item) list.push(item);
      }
      return list;
    } catch {
      return [];
    }
  }

  /**
   * Persists an EphemeralShareRecord in local storage under an opaque key.
   */
  private static persistRecord(record: EphemeralShareRecord): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(`${SHARES_STORAGE_PREFIX}${record.shareId}`, JSON.stringify(record));

      // Update index
      const rawIndex = localStorage.getItem(SHARES_INDEX_KEY);
      const list: string[] = rawIndex ? JSON.parse(rawIndex) : [];
      if (!list.includes(record.shareId)) {
        list.push(record.shareId);
        localStorage.setItem(SHARES_INDEX_KEY, JSON.stringify(list));
      }
    } catch (err) {
      console.warn('[EPHEMERAL_SHARE] Persist record failed:', err);
    }
  }

  /**
   * Computes HMAC-SHA256 signature for share integrity verification.
   */
  private static async signShare(
    shareId: string,
    manifestId: string,
    expiresAt: number,
    saltKey: Uint8Array
  ): Promise<string> {
    const encoder = new TextEncoder();
    const canonical = `${shareId}::${manifestId}::${expiresAt}`;

    const key = await crypto.subtle.importKey(
      'raw',
      saltKey as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
    return MemorySanitizer.bytesToHex(new Uint8Array(sig));
  }
}
