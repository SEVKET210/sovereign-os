/* ============================================================
   SOVEREIGN-OS — Background Cloud Storage Synchronization Queue Engine
   Buffers outbound 4MB encrypted fragments in IndexedDB sync_queue,
   drains them to the active external cloud destination upon network connectivity,
   and computes real-time telemetry (synchronized blocks & remote bytes).
   ============================================================ */

import { StorageAdapter } from './StorageAdapter';
import { CloudStorageManager } from './CloudStorageManager';
import { ByosCredentialEnclave } from './ByosCredentialEnclave';
import type {
  CloudProviderConfig,
  CloudSyncTelemetry,
  StorageEndpoint,
} from '../../types';

export interface CloudQueueItem {
  id?: number;
  chunkHash: string;
  payloadLength: number;
  provider: StorageEndpoint;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;
  createdAt: number;
  syncedAt?: number;
  error?: string;
}

export class CloudSyncQueueEngine {
  private static isProcessing = false;
  private static listeners: Set<(telemetry: CloudSyncTelemetry) => void> = new Set();
  private static inMemorySyncedBlocks = 0;
  private static currentProvider: StorageEndpoint = 'VDS_LOCAL';
  private static activeConfig: CloudProviderConfig | null = null;

  /**
   * Initializes network liveness listeners.
   */
  public static initialize(config: CloudProviderConfig): void {
    this.activeConfig = config;
    this.currentProvider = config.provider;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.drainQueue().catch(() => {});
      });
    }

    this.recomputeTelemetry().catch(() => {});
  }

  public static updateConfig(config: CloudProviderConfig): void {
    this.activeConfig = config;
    this.currentProvider = config.provider;
    this.recomputeTelemetry().catch(() => {});
  }

  /**
   * Subscribes a listener to live queue telemetry updates.
   */
  public static subscribe(listener: (telemetry: CloudSyncTelemetry) => void): () => void {
    this.listeners.add(listener);
    this.recomputeTelemetry().then((t) => listener(t)).catch(() => {});
    return () => this.listeners.delete(listener);
  }

  private static emitTelemetry(telemetry: CloudSyncTelemetry): void {
    for (const listener of this.listeners) {
      try {
        listener(telemetry);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Enqueues an encrypted chunk for outbound synchronization to the active cloud provider.
   */
  public static async enqueueChunk(
    chunkHash: string,
    payloadLength: number,
    provider: StorageEndpoint
  ): Promise<void> {
    if (provider === 'VDS_LOCAL') {
      // Local VDS storage is instantly synchronized in IndexedDB
      this.inMemorySyncedBlocks += 1;
      await this.recomputeTelemetry();
      return;
    }

    try {
      const db = await StorageAdapter.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['sync_queue'], 'readwrite');
        const store = tx.objectStore('sync_queue');

        const queueItem: CloudQueueItem = {
          chunkHash,
          payloadLength,
          provider,
          status: 'pending',
          retries: 0,
          createdAt: Date.now(),
        };

        const req = store.add(queueItem);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      await this.recomputeTelemetry();

      // Trigger queue processing
      this.drainQueue().catch(() => {});
    } catch (err) {
      console.warn('[SYNC_QUEUE] Failed to enqueue chunk:', err);
    }
  }

  /**
   * Drains pending items in the synchronization queue to the active cloud destination.
   */
  public static async drainQueue(): Promise<void> {
    if (this.isProcessing) return;
    if (!this.activeConfig || this.activeConfig.provider === 'VDS_LOCAL') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.recomputeTelemetry('BUFFERED_OFFLINE');
      return;
    }

    this.isProcessing = true;
    await this.recomputeTelemetry('SYNCING');

    try {
      const db = await StorageAdapter.getDB();
      const pendingItems: CloudQueueItem[] = await new Promise((resolve) => {
        const tx = db.transaction(['sync_queue'], 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result as CloudQueueItem[]) || [];
          resolve(all.filter((i) => i.status === 'pending' || i.status === 'failed'));
        };
        req.onerror = () => resolve([]);
      });

      const creds = ByosCredentialEnclave.getInMemoryCredentials(this.activeConfig.provider);

      for (const item of pendingItems) {
        try {
          // 1. Read chunk from local store
          const chunkBytes = await StorageAdapter.readChunk(item.chunkHash);

          // 2. Dispatch to cloud
          await CloudStorageManager.writeChunkToCloud(
            item.chunkHash,
            chunkBytes,
            this.activeConfig,
            creds
          );

          // 3. Mark as synced
          await new Promise<void>((resolve) => {
            const tx = db.transaction(['sync_queue'], 'readwrite');
            const store = tx.objectStore('sync_queue');
            item.status = 'synced';
            item.syncedAt = Date.now();
            store.put(item);
            tx.oncomplete = () => resolve();
          });

          this.inMemorySyncedBlocks += 1;
        } catch (err) {
          console.warn(`[SYNC_QUEUE] Dispatch failed for chunk ${item.chunkHash}:`, err);
          item.retries += 1;
          item.status = 'failed';
          item.error = err instanceof Error ? err.message : String(err);

          await new Promise<void>((resolve) => {
            const tx = db.transaction(['sync_queue'], 'readwrite');
            const store = tx.objectStore('sync_queue');
            store.put(item);
            tx.oncomplete = () => resolve();
          });
        }
      }

      await this.recomputeTelemetry('IDLE');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Recomputes live queue telemetry and notifies subscribers.
   */
  public static async recomputeTelemetry(
    forcedState?: 'IDLE' | 'SYNCING' | 'BUFFERED_OFFLINE' | 'ERROR'
  ): Promise<CloudSyncTelemetry> {
    let pendingCount = 0;
    let syncedCount = this.inMemorySyncedBlocks;

    try {
      const db = await StorageAdapter.getDB();
      const allItems: CloudQueueItem[] = await new Promise((resolve) => {
        const tx = db.transaction(['sync_queue'], 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as CloudQueueItem[]) || []);
        req.onerror = () => resolve([]);
      });

      pendingCount = allItems.filter((i) => i.status === 'pending' || i.status === 'failed').length;
      const dbSynced = allItems.filter((i) => i.status === 'synced').length;
      syncedCount = Math.max(syncedCount, dbSynced);
    } catch {
      // ignore
    }

    // Default VDS local block count if provider is local
    if (this.currentProvider === 'VDS_LOCAL') {
      try {
        const metrics = await StorageAdapter.getStorageMetrics();
        syncedCount = metrics.totalBlocks;
      } catch {
        // ignore
      }
    }

    const CHUNK_SIZE = 4194304; // 4MB
    const totalRemoteBytes = syncedCount * CHUNK_SIZE;

    let syncState: 'IDLE' | 'SYNCING' | 'BUFFERED_OFFLINE' | 'ERROR' = 'IDLE';
    if (forcedState) {
      syncState = forcedState;
    } else if (typeof navigator !== 'undefined' && !navigator.onLine && pendingCount > 0) {
      syncState = 'BUFFERED_OFFLINE';
    } else if (pendingCount > 0) {
      syncState = 'SYNCING';
    }

    const telemetry: CloudSyncTelemetry = {
      activeProvider: this.currentProvider,
      synchronizedBlockCount: syncedCount,
      pendingQueueCount: pendingCount,
      totalRemoteBytes,
      syncState,
      lastSyncTimestamp: Date.now(),
    };

    this.emitTelemetry(telemetry);
    return telemetry;
  }
}
