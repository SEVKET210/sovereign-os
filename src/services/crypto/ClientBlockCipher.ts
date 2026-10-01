/* ============================================================
   SOVEREIGN-OS — Client Block Cipher & Entropy Engine
   AES-128/256 16-byte block decomposition & Shannon Entropy
   ============================================================ */

export interface CipherBlock16 {
  index: number;
  hex: string;
  ascii: string;
  byteLength: number;
  isPadded: boolean;
}

export interface DecompositionResult {
  rawText: string;
  byteLength: number;
  blockCount: number;
  shannonEntropyBits: number;
  entropyClassification: 'CRITICAL_LOW' | 'WEAK' | 'ROBUST' | 'SOVEREIGN_GRADE';
  blocks: CipherBlock16[];
  sha256Digest: string;
}

export class ClientBlockCipher {
  private static encoder = new TextEncoder();

  /**
   * Calculates mathematical Shannon Entropy:
   * H(X) = -sum(P(x) * log2(P(x)))
   */
  public static calculateShannonEntropy(str: string): number {
    if (!str) return 0;

    const len = str.length;
    const frequencies: Record<string, number> = {};

    for (let i = 0; i < len; i++) {
      const char = str[i];
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    for (const char in frequencies) {
      const p = frequencies[char] / len;
      entropy -= p * Math.log2(p);
    }

    return parseFloat(entropy.toFixed(3));
  }

  /**
   * Decomposes any input secret string into 16-byte aligned AES blocks,
   * calculating Shannon entropy and SHA-256 digest in real-time.
   */
  public static async decomposeIntoBlocks(text: string): Promise<DecompositionResult> {
    const bytes = this.encoder.encode(text);
    const byteLength = bytes.length;
    const entropy = this.calculateShannonEntropy(text);

    let classification: 'CRITICAL_LOW' | 'WEAK' | 'ROBUST' | 'SOVEREIGN_GRADE' = 'CRITICAL_LOW';
    if (entropy > 4.5) classification = 'SOVEREIGN_GRADE';
    else if (entropy > 3.5) classification = 'ROBUST';
    else if (entropy > 2.0) classification = 'WEAK';

    // 16-byte block cleavage
    const blocks: CipherBlock16[] = [];
    const blockSize = 16;
    const totalBlocks = Math.max(1, Math.ceil(byteLength / blockSize));

    for (let b = 0; b < totalBlocks; b++) {
      const start = b * blockSize;
      const end = Math.min(start + blockSize, byteLength);
      const slice = bytes.slice(start, end);

      // Convert to hex
      let hex = '';
      let ascii = '';
      for (let i = 0; i < blockSize; i++) {
        if (i < slice.length) {
          const byte = slice[i];
          hex += byte.toString(16).padStart(2, '0').toUpperCase() + ' ';
          ascii += (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '•';
        } else {
          // PKCS#7 or zero padding simulation
          hex += '00 ';
          ascii += '·';
        }
      }

      blocks.push({
        index: b,
        hex: hex.trim(),
        ascii,
        byteLength: slice.length,
        isPadded: slice.length < blockSize,
      });
    }

    // Client-side SHA-256 Digest
    const digestBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const sha256Digest = Array.from(new Uint8Array(digestBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return {
      rawText: text,
      byteLength,
      blockCount: totalBlocks,
      shannonEntropyBits: entropy,
      entropyClassification: classification,
      blocks,
      sha256Digest,
    };
  }

  /**
   * Simulates shredding a large file into 4 MB client-side encrypted chunks
   * for zero-knowledge BYOS dispatch.
   */
  public static simulateByosChunking(fileSizeBytes: number): {
    chunkCount: number;
    chunkSizeBytes: number;
    chunks: Array<{ index: number; chunkHash: string; byteRange: string }>;
  } {
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB
    const chunkCount = Math.max(1, Math.ceil(fileSizeBytes / CHUNK_SIZE));
    const chunks = [];

    for (let i = 0; i < Math.min(chunkCount, 8); i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min((i + 1) * CHUNK_SIZE - 1, fileSizeBytes);
      chunks.push({
        index: i,
        chunkHash: `0x${((i * 1847192) ^ 0xabcdef).toString(16).padStart(8, '0')}...chunk`,
        byteRange: `${(start / (1024 * 1024)).toFixed(1)}MB – ${(end / (1024 * 1024)).toFixed(1)}MB`,
      });
    }

    return {
      chunkCount,
      chunkSizeBytes: CHUNK_SIZE,
      chunks,
    };
  }
}
