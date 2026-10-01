/* ============================================================
   SOVEREIGN-OS — Diskless In-Memory Assembly & RAM-Only Streaming
   Concurrent chunk retrieval, DEK unwrapping, padding depletion,
   and zero-disk-write volatile browser previewing
   ============================================================ */

import { StorageAdapter } from './StorageAdapter';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { ChunkingEngine } from './ChunkingEngine';
import { CloudStorageManager } from './CloudStorageManager';
import { ByosCredentialEnclave } from './ByosCredentialEnclave';
import type { FileManifest, RamPreviewSession, CloudProviderConfig } from '../../types';

export class VaultStreamService {
  private static activePreview: RamPreviewSession | null = null;

  /**
   * Reconstitutes an encrypted file entirely within volatile browser RAM.
   * Concurrently pulls from external cloud provider if needed,
   * unseals DEK, de-pads 4MB chunks, and produces volatile object URL.
   * Never writes plaintext to disk or cache.
   */
  public static async assembleFileInRam(
    manifest: FileManifest,
    masterKwKey: CryptoKey,
    onProgress?: (fetchedChunks: number, totalChunks: number) => void,
    cloudConfig?: CloudProviderConfig
  ): Promise<{
    reconstructedBuffer: Uint8Array;
    blob: Blob;
    objectUrl: string;
  }> {
    // Memory Hygiene: Clean up and zeroize any previous active preview session first
    if (this.activePreview) {
      this.destroyPreview();
    }

    const totalChunks = manifest.chunkIndex.length;
    const decryptedSlices: Uint8Array[] = new Array(totalChunks);

    // 1. Fetch & Decrypt chunks concurrently in RAM
    const fetchPromises = manifest.chunkIndex.map(async (desc, index) => {
      // Fetch raw serialized payload (from local cache or active cloud provider)
      let serializedChunk: Uint8Array;
      try {
        serializedChunk = await StorageAdapter.readChunk(desc.chunkHash);
      } catch (localErr) {
        if (cloudConfig && cloudConfig.provider !== 'VDS_LOCAL') {
          const creds = ByosCredentialEnclave.getInMemoryCredentials(cloudConfig.provider);
          serializedChunk = await CloudStorageManager.readChunkFromCloud(
            desc.chunkHash,
            cloudConfig,
            creds
          );
          // Cache locally in IndexedDB for subsequent offline speed
          await StorageAdapter.writeChunk(desc.chunkHash, serializedChunk, false).catch(() => {});
        } else {
          throw localErr;
        }
      }

      // Verify payload length meets expected 4,194,373 bytes
      if (serializedChunk.byteLength !== ChunkingEngine.TOTAL_SERIALIZED_SIZE) {
        throw new Error(
          `CORRUPTED_CHUNK_SIZE: Chunk ${desc.chunkHash} has invalid byte length (${serializedChunk.byteLength} vs ${ChunkingEngine.TOTAL_SERIALIZED_SIZE}).`
        );
      }

      // 2. Parse standardized serialized layout:
      // [Version (1B) | Nonce (12B) | WrappedDEK (40B) | AuthTag (16B) | PaddedCiphertext (4,194,304B)]
      const version = serializedChunk[0];
      if (version !== ChunkingEngine.ENVELOPE_VERSION) {
        throw new Error(`UNSUPPORTED_CHUNK_VERSION: Version ${version} is incompatible.`);
      }

      const nonce = serializedChunk.subarray(1, 1 + ChunkingEngine.NONCE_LENGTH);
      const wrappedDek = serializedChunk.subarray(
        1 + ChunkingEngine.NONCE_LENGTH,
        1 + ChunkingEngine.NONCE_LENGTH + ChunkingEngine.WRAPPED_DEK_LENGTH
      );
      const authTag = serializedChunk.subarray(
        1 + ChunkingEngine.NONCE_LENGTH + ChunkingEngine.WRAPPED_DEK_LENGTH,
        ChunkingEngine.HEADER_LENGTH
      );
      const ciphertext = serializedChunk.subarray(ChunkingEngine.HEADER_LENGTH);

      // 3. Unwrap ephemeral DEK using Master Key Wrap Key (AES-KW)
      let dek: CryptoKey;
      try {
        dek = await crypto.subtle.unwrapKey(
          'raw',
          wrappedDek as unknown as BufferSource,
          masterKwKey,
          'AES-KW',
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
      } catch {
        throw new Error(`DEK_UNWRAP_FAILED: Cryptographic integrity failure for chunk ${desc.chunkHash}.`);
      }

      // 4. Decrypt padded 4 MB block and verify 16-byte GCM authentication tag
      // Reassemble ciphertext + authTag for Web Crypto Subtle decrypt
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
      } catch {
        MemorySanitizer.zeroize(fullCiphertext);
        throw new Error(`GCM_AUTH_FAILED: Authentication tag mismatch on chunk ${desc.chunkHash}. Potential tampering detected!`);
      } finally {
        MemorySanitizer.zeroize(fullCiphertext);
      }

      const unpaddedChunkBytes = new Uint8Array(decryptedPaddedBlock);

      // 5. Padding Depletion:
      // If this is the final chunk, trim off the CSPRNG noise padding
      if (index === totalChunks - 1) {
        const expectedBytesInFinalChunk =
          manifest.trueByteLength - (totalChunks - 1) * ChunkingEngine.CHUNK_QUANTUM;
        const validSlice = unpaddedChunkBytes.slice(0, expectedBytesInFinalChunk);
        MemorySanitizer.zeroize(unpaddedChunkBytes);
        decryptedSlices[index] = validSlice;
      } else {
        decryptedSlices[index] = unpaddedChunkBytes;
      }

      if (onProgress) {
        onProgress(index + 1, totalChunks);
      }
    });

    try {
      await Promise.all(fetchPromises);

      // 6. Concatenate decrypted unpadded slices into single contiguous buffer
      const reconstructedBuffer = new Uint8Array(manifest.trueByteLength);
      let offset = 0;
      for (const slice of decryptedSlices) {
        if (slice) {
          reconstructedBuffer.set(slice, offset);
          offset += slice.byteLength;
          MemorySanitizer.zeroize(slice); // Scrub individual slice
        }
      }

      // 7. In-Memory Delivery via Scoped Blob & Object URL
      const blob = new Blob([reconstructedBuffer as unknown as BlobPart], {
        type: manifest.mimeType || 'application/octet-stream',
      });
      const objectUrl = URL.createObjectURL(blob);

      // Track active session for volatile destruction
      this.activePreview = {
        manifest,
        objectUrl,
        reconstructedBuffer,
        openedAt: Date.now(),
      };

      return {
        reconstructedBuffer,
        blob,
        objectUrl,
      };
    } catch (err) {
      // Memory Hygiene: Zeroize all partially decrypted slices on failure to prevent heap remnants
      for (const slice of decryptedSlices) {
        if (slice) {
          MemorySanitizer.zeroize(slice);
        }
      }
      throw err;
    }
  }

  /**
   * Volatile Destruction Protocol:
   * Immediately revokes Object URL and zeroizes reconstructed array buffers with 0x00.
   */
  public static destroyPreview(): void {
    if (!this.activePreview) return;

    // 1. Revoke URL
    try {
      URL.revokeObjectURL(this.activePreview.objectUrl);
    } catch {
      // ignore
    }

    // 2. Scrub RAM buffers
    MemorySanitizer.zeroize(this.activePreview.reconstructedBuffer);
    this.activePreview = null;
  }

  /**
   * Returns current active preview session if any.
   */
  public static getActivePreview(): RamPreviewSession | null {
    return this.activePreview;
  }
}
