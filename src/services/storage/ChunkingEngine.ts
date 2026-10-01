/* ============================================================
   SOVEREIGN-OS — Constant-Size Chunking & Cryptographic Padding Engine
   Strict 4 MB Block Quantum (4,194,304B) with CSPRNG Noise Padding
   Defeats size fingerprinting, length classification, and traffic analysis
   Serialized layout: [Version (1B) | Nonce (12B) | WrappedDEK (40B) | AuthTag (16B) | PaddedCiphertext (4,194,304B)]
   ============================================================ */

import { MemorySanitizer } from '../crypto/MemorySanitizer';
import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import type { ChunkDescriptor } from '../../types';

export interface EncryptedChunkOutput {
  sequence: number;
  chunkHash: string; // Content-addressed SHA-256 hash
  fileName: string; // <chunkHash>.bin
  serializedPayload: Uint8Array; // 4,194,373 bytes constant length
  byteRange: [number, number];
}

export class ChunkingEngine {
  public static readonly CHUNK_QUANTUM = 4 * 1024 * 1024; // Exactly 4,194,304 bytes (4 MB)
  public static readonly ENVELOPE_VERSION = 1;
  public static readonly NONCE_LENGTH = 12; // 96-bit AES-GCM IV (NIST SP 800-38D standard)
  public static readonly WRAPPED_DEK_LENGTH = 40; // 256-bit key wrapped with AES-KW = 40 bytes
  public static readonly AUTH_TAG_LENGTH = 16; // 128-bit AES-GCM Tag
  public static readonly HEADER_LENGTH = 1 + 12 + 40 + 16; // 69 bytes
  public static readonly TOTAL_SERIALIZED_SIZE = 69 + 4 * 1024 * 1024; // 4,194,373 bytes

  /**
   * Slices an input byte stream into strict 4 MB constant blocks,
   * pads final block with cryptographically secure random noise,
   * envelope-encrypts each chunk with 12-byte nonces, and emits content-addressed blind payloads.
   */
  public static async processFile(
    rawBytes: Uint8Array,
    masterKwKey: CryptoKey,
    onProgress?: (processedChunks: number, totalChunks: number, chunkHash: string, paddingBytes: number) => void,
    bindingContext?: { workspaceId: string; fileId: string }
  ): Promise<{
    descriptors: ChunkDescriptor[];
    chunks: EncryptedChunkOutput[];
    trueByteLength: number;
    paddingBytes: number;
  }> {
    const trueByteLength = rawBytes.byteLength;
    const totalChunks = Math.max(1, Math.ceil(trueByteLength / this.CHUNK_QUANTUM));
    const descriptors: ChunkDescriptor[] = [];
    const chunks: EncryptedChunkOutput[] = [];
    const workspaceId = bindingContext?.workspaceId || 'sovereign_vault';
    const fileId = bindingContext?.fileId || 'quantum_file';

    for (let seq = 0; seq < totalChunks; seq++) {
      const start = seq * this.CHUNK_QUANTUM;
      const end = Math.min(start + this.CHUNK_QUANTUM, trueByteLength);
      const rawSlice = rawBytes.subarray(start, end);

      // 1. Quantum Padding: Ensure slice is precisely 4,194,304 bytes
      const paddedBlock = new Uint8Array(this.CHUNK_QUANTUM);
      paddedBlock.set(rawSlice, 0);

      // If last slice is smaller than 4 MB, fill remainder with CSPRNG noise
      if (rawSlice.byteLength < this.CHUNK_QUANTUM) {
        const noiseLength = this.CHUNK_QUANTUM - rawSlice.byteLength;
        const noiseOffset = rawSlice.byteLength;
        // crypto.getRandomValues operates in max 65536-byte chunks in standard Web Crypto
        this.fillWithCsprngNoise(paddedBlock, noiseOffset, noiseLength);
      }

      // 2. Per-chunk ephemeral 256-bit AES-GCM DEK
      const dek = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // 3. 12-byte initialization vector (nonce)
      const nonce = crypto.getRandomValues(new Uint8Array(this.NONCE_LENGTH));

      // 4. Derive canonical AAD context binding for chunk
      const chunkAad = EnvelopeCipher.deriveAad({
        workspaceId,
        recordId: fileId,
        fieldName: `chunk_${seq}`,
        schemaVersion: 1,
      });

      // 5. Encrypt padded block with AES-256-GCM and bound AAD
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce as unknown as BufferSource,
          additionalData: chunkAad as unknown as BufferSource,
          tagLength: 128,
        },
        dek,
        paddedBlock as unknown as BufferSource
      );

      // Extract ciphertext and 16-byte authentication tag
      const encryptedBytes = new Uint8Array(encryptedBuffer);
      const tagOffset = encryptedBytes.length - this.AUTH_TAG_LENGTH;
      const ciphertext = encryptedBytes.subarray(0, tagOffset);
      const authTag = encryptedBytes.subarray(tagOffset);

      // 5. Wrap DEK via Master Key Wrap Key (AES-KW) -> yields exactly 40 bytes
      const wrappedDekBuffer = await crypto.subtle.wrapKey(
        'raw',
        dek,
        masterKwKey,
        'AES-KW'
      );
      const wrappedDek = new Uint8Array(wrappedDekBuffer);

      // 6. Assemble standardized serialized payload
      // [Version (1B) | Nonce (12B) | WrappedDEK (40B) | AuthTag (16B) | PaddedCiphertext (4,194,304B)]
      const serializedPayload = new Uint8Array(this.TOTAL_SERIALIZED_SIZE);
      serializedPayload[0] = this.ENVELOPE_VERSION;
      serializedPayload.set(nonce, 1);
      serializedPayload.set(wrappedDek, 1 + this.NONCE_LENGTH);
      serializedPayload.set(authTag, 1 + this.NONCE_LENGTH + this.WRAPPED_DEK_LENGTH);
      serializedPayload.set(ciphertext, this.HEADER_LENGTH);

      // 7. Content-Addressed Blind Identifier: SHA-256 of the complete encrypted payload
      const hashBuffer = await crypto.subtle.digest('SHA-256', serializedPayload as unknown as BufferSource);
      const chunkHash = MemorySanitizer.bytesToHex(new Uint8Array(hashBuffer));
      const fileName = `${chunkHash}.bin`;

      // Scrub unencrypted memory buffers immediately
      MemorySanitizer.zeroize(paddedBlock);

      const chunkOutput: EncryptedChunkOutput = {
        sequence: seq,
        chunkHash,
        fileName,
        serializedPayload,
        byteRange: [start, end],
      };

      chunks.push(chunkOutput);
      descriptors.push({
        chunkSequence: seq,
        chunkHash,
        byteRange: [start, end],
      });

      const totalPaddedBytes = totalChunks * this.CHUNK_QUANTUM;
      const totalPaddingBytes = totalPaddedBytes - trueByteLength;

      if (onProgress) {
        onProgress(seq + 1, totalChunks, chunkHash, totalPaddingBytes);
      }
    }

    const totalPaddedBytes = totalChunks * this.CHUNK_QUANTUM;
    const paddingBytes = totalPaddedBytes - trueByteLength;

    return {
      descriptors,
      chunks,
      trueByteLength,
      paddingBytes,
    };
  }

  /**
   * Cryptographically secure pseudorandom noise generator.
   * Fills buffer from offset to offset + length using window.crypto.getRandomValues.
   */
  private static fillWithCsprngNoise(
    targetBuffer: Uint8Array,
    offset: number,
    totalLength: number
  ): void {
    const MAX_QUOTA = 65536; // Web Crypto limit per getRandomValues call
    let written = 0;

    while (written < totalLength) {
      const sliceSize = Math.min(MAX_QUOTA, totalLength - written);
      const tempQuota = new Uint8Array(sliceSize);
      crypto.getRandomValues(tempQuota);
      targetBuffer.set(tempQuota, offset + written);
      written += sliceSize;
      MemorySanitizer.zeroize(tempQuota);
    }
  }
}
