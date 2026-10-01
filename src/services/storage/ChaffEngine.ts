/* ============================================================
   SOVEREIGN-OS — Decoy Block Chaffing Engine
   Active defensive counter-intelligence against storage volume monitoring.
   Dispatches synthetic decoy chunks with identical byte sizes (4,194,373B)
   rendering authentic document count and enterprise data size mathematically unknowable.
   ============================================================ */

import { StorageAdapter } from './StorageAdapter';
import { ChunkingEngine } from './ChunkingEngine';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import type { ChaffMetrics } from '../../types';

export class ChaffEngine {
  private static timerId: number | null = null;
  private static isChaffing = false;

  /**
   * Generates a single synthetic decoy block indistinguishable from authentic encrypted chunks.
   * Matches exact quantum size (4,194,373 bytes).
   */
  public static async generateDecoyChunk(): Promise<{
    chunkHash: string;
    fileName: string;
  }> {
    const decoyPayload = new Uint8Array(ChunkingEngine.TOTAL_SERIALIZED_SIZE);

    // Set valid envelope version byte
    decoyPayload[0] = ChunkingEngine.ENVELOPE_VERSION;

    // Fill remaining bytes with CSPRNG noise
    const MAX_QUOTA = 65536;
    let offset = 1;
    const remaining = ChunkingEngine.TOTAL_SERIALIZED_SIZE - 1;
    let written = 0;

    while (written < remaining) {
      const sliceSize = Math.min(MAX_QUOTA, remaining - written);
      const tempQuota = new Uint8Array(sliceSize);
      crypto.getRandomValues(tempQuota);
      decoyPayload.set(tempQuota, offset + written);
      written += sliceSize;
      MemorySanitizer.zeroize(tempQuota);
    }

    // Compute SHA-256 hash for content-addressed blind storage
    const hashBuffer = await crypto.subtle.digest('SHA-256', decoyPayload as unknown as BufferSource);
    const chunkHash = MemorySanitizer.bytesToHex(new Uint8Array(hashBuffer));
    const fileName = `${chunkHash}.bin`;

    // Persist as unreferenced decoy block
    await StorageAdapter.writeChunk(chunkHash, decoyPayload, true);

    // Wipe memory immediately
    MemorySanitizer.zeroize(decoyPayload);

    return { chunkHash, fileName };
  }

  /**
   * Dispatches a burst of synthetic decoy chunks.
   */
  public static async dispatchChaffBurst(count = 3): Promise<string[]> {
    const hashes: string[] = [];
    for (let i = 0; i < count; i++) {
      const { chunkHash } = await this.generateDecoyChunk();
      hashes.push(chunkHash);
    }
    return hashes;
  }

  /**
   * Starts a background routine that periodically dispatches decoy noise blocks.
   */
  public static startBackgroundChaffing(intervalMs = 60000): () => void {
    if (this.timerId !== null) return () => this.stopBackgroundChaffing();

    this.isChaffing = true;
    this.timerId = window.setInterval(async () => {
      try {
        await this.generateDecoyChunk();
      } catch (err) {
        console.warn('[CHAFF_ENGINE] Failed to emit decoy block:', err);
      }
    }, intervalMs);

    return () => this.stopBackgroundChaffing();
  }

  /**
   * Halts background decoy dispatching.
   */
  public static stopBackgroundChaffing(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isChaffing = false;
  }

  /**
   * Retrieves chaff and authentic block statistics.
   */
  public static async getMetrics(): Promise<ChaffMetrics> {
    const metrics = await StorageAdapter.getStorageMetrics();
    return {
      authenticChunks: metrics.authenticChunks,
      chaffChunks: metrics.chaffChunks,
      isChaffing: this.isChaffing,
    };
  }
}
