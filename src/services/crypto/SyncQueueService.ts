/* ============================================================
   SOVEREIGN-OS — Client Offline Sync Queue (IndexedDB)
   Sequentially persists encrypted envelopes offline and drains
   to the self-hosted Supabase / PostgreSQL database upon reconnection
   ============================================================ */

import type { SyncQueueItem } from '../../types';

export class SyncQueueService {
  private static readonly DB_NAME = 'sovereign_zk_sync_db';
  private static readonly DB_VERSION = 3;
  private static readonly QUEUE_STORE = 'sync_queue';
  private static readonly CACHE_STORE = 'local_cache';
  private static readonly CHUNK_STORE = 'chunk_storage';
  private static readonly SHARES_STORE = 'ephemeral_shares';

  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static isDraining = false;
  private static subscribers: Array<(pendingCount: number, isOnline: boolean) => void> = [];

  /**
   * Initializes or returns open IndexedDB instance.
   */
  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('INDEXED_DB_UNAVAILABLE: IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Sync Queue Object Store
        if (!db.objectStoreNames.contains(this.QUEUE_STORE)) {
          const queueStore = db.createObjectStore(this.QUEUE_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('queue_id', 'queue_id', { unique: true });
          queueStore.createIndex('table_name', 'table_name', { unique: false });
          queueStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 2. Optimistic Encrypted Local Cache Store
        if (!db.objectStoreNames.contains(this.CACHE_STORE)) {
          db.createObjectStore(this.CACHE_STORE, { keyPath: 'composite_key' });
        }

        // 3. Chunk Store
        if (!db.objectStoreNames.contains(this.CHUNK_STORE)) {
          const chunkStore = db.createObjectStore(this.CHUNK_STORE, { keyPath: 'chunk_hash' });
          chunkStore.createIndex('is_chaff', 'is_chaff', { unique: false });
        }

        // 4. Ephemeral Shares Store
        if (!db.objectStoreNames.contains(this.SHARES_STORE)) {
          const shareStore = db.createObjectStore(this.SHARES_STORE, { keyPath: 'shareId' });
          shareStore.createIndex('manifestId', 'manifestId', { unique: false });
          shareStore.createIndex('status', 'status', { unique: false });
          shareStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        this.setupOnlineListener();
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Enqueues an encrypted payload for database synchronization.
   */
  public static async enqueue(
    item: Omit<SyncQueueItem, 'id' | 'queue_id' | 'status' | 'retries' | 'created_at'>
  ): Promise<SyncQueueItem> {
    const db = await this.getDB();
    const queueItem: SyncQueueItem = {
      ...item,
      queue_id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      retries: 0,
      created_at: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(this.QUEUE_STORE);
      const request = store.add(queueItem);

      request.onsuccess = () => {
        queueItem.id = request.result as number;
        this.notifySubscribers();
        resolve(queueItem);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieves all pending queue items in chronological order.
   */
  public static async getPendingQueue(): Promise<SyncQueueItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.QUEUE_STORE], 'readonly');
      const store = tx.objectStore(this.QUEUE_STORE);
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => {
        const items = (request.result as SyncQueueItem[]) || [];
        items.sort((a, b) => a.created_at - b.created_at);
        resolve(items);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Updates queue item status to synced.
   */
  public static async markSynced(id: number): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(this.QUEUE_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result as SyncQueueItem | undefined;
        if (!item) {
          resolve();
          return;
        }
        item.status = 'synced';
        item.synced_at = Date.now();
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          this.notifySubscribers();
          resolve();
        };
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Marks item as failed and increments retry count.
   */
  public static async markFailed(id: number, errorMessage: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.QUEUE_STORE], 'readwrite');
      const store = tx.objectStore(this.QUEUE_STORE);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result as SyncQueueItem | undefined;
        if (!item) {
          resolve();
          return;
        }
        item.retries += 1;
        item.last_error = errorMessage;
        if (item.retries >= 5) {
          item.status = 'failed';
        }
        const putReq = store.put(item);
        putReq.onsuccess = () => {
          this.notifySubscribers();
          resolve();
        };
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Drains all pending items via the supplied transport handler.
   */
  public static async drainQueue(
    drainHandler: (item: SyncQueueItem) => Promise<boolean>
  ): Promise<{ processed: number; failed: number }> {
    if (this.isDraining) return { processed: 0, failed: 0 };
    this.isDraining = true;

    let processed = 0;
    let failed = 0;

    try {
      const pendingItems = await this.getPendingQueue();
      for (const item of pendingItems) {
        if (!item.id) continue;
        try {
          const success = await drainHandler(item);
          if (success) {
            await this.markSynced(item.id);
            processed++;
          } else {
            await this.markFailed(item.id, 'TRANSPORT_REJECTED');
            failed++;
          }
        } catch (err) {
          await this.markFailed(item.id, err instanceof Error ? err.message : 'DRAIN_EXCEPTION');
          failed++;
        }
      }
    } finally {
      this.isDraining = false;
      this.notifySubscribers();
    }

    return { processed, failed };
  }

  /**
   * Caches an entity record in IndexedDB for instant offline hydration.
   */
  public static async cacheRecord(
    tableName: string,
    recordId: string,
    data: unknown
  ): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.CACHE_STORE], 'readwrite');
      const store = tx.objectStore(this.CACHE_STORE);
      const compositeKey = `${tableName}:${recordId}`;
      const request = store.put({ composite_key: compositeKey, tableName, recordId, data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clears all cached records for a specific table from IndexedDB.
   */
  public static async clearTable(tableName: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([this.CACHE_STORE], 'readwrite');
        const store = tx.objectStore(this.CACHE_STORE);
        const request = store.openCursor();
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            if (cursor.value.tableName === tableName) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      // In case IndexedDB is not accessible
    }
  }

  /**
   * Retrieves a single cached record by table and record ID.
   */
  public static async getCachedRecord<T>(tableName: string, recordId: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([this.CACHE_STORE], 'readonly');
        const store = tx.objectStore(this.CACHE_STORE);
        const compositeKey = `${tableName}:${recordId}`;
        const request = store.get(compositeKey);
        request.onsuccess = () => {
          if (request.result && request.result.data !== undefined) {
            resolve(request.result.data as T);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all cached records for a specific table.
   */
  public static async getAllCachedRecords<T>(tableName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.CACHE_STORE], 'readonly');
      const store = tx.objectStore(this.CACHE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as Array<{ tableName: string; data: T }>) || [];
        const filtered = results
          .filter((row) => row.tableName === tableName)
          .map((row) => row.data);
        resolve(filtered);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Counts currently pending items.
   */
  public static async getPendingCount(): Promise<number> {
    try {
      const pending = await this.getPendingQueue();
      return pending.length;
    } catch {
      return 0;
    }
  }

  /**
   * Subscribes to sync queue and network status changes.
   */
  public static subscribe(callback: (pendingCount: number, isOnline: boolean) => void): () => void {
    this.subscribers.push(callback);
    this.getPendingCount().then((count) => {
      callback(count, typeof navigator !== 'undefined' ? navigator.onLine : true);
    });
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private static notifySubscribers() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.getPendingCount().then((count) => {
      for (const sub of this.subscribers) {
        sub(count, isOnline);
      }
    });
  }

  private static setupOnlineListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifySubscribers();
      });
      window.addEventListener('offline', () => {
        this.notifySubscribers();
      });
    }
  }
}
