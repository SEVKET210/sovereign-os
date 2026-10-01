/* ============================================================
   SOVEREIGN-OS — Blind BYOS Storage Adapter
   Persists and retrieves constant-size encrypted blocks indexed
   strictly by their content-addressed SHA-256 hash (<hash>.bin)
   with zero human-readable metadata or directory hierarchies
   ============================================================ */

export class StorageAdapter {
  private static readonly DB_NAME = 'sovereign_zk_sync_db';
  private static readonly DB_VERSION = 4; // Synchronized schema version with cloud credentials
  private static readonly CHUNK_STORE = 'chunk_storage';
  private static readonly CHAFF_FLAG_KEY = 'is_chaff';

  private static dbPromise: Promise<IDBDatabase> | null = null;

  public static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('INDEXED_DB_UNAVAILABLE: IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Chunk Store
        if (!db.objectStoreNames.contains(this.CHUNK_STORE)) {
          const store = db.createObjectStore(this.CHUNK_STORE, { keyPath: 'chunk_hash' });
          store.createIndex(this.CHAFF_FLAG_KEY, this.CHAFF_FLAG_KEY, { unique: false });
        }

        // 2. Sync Queue Store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('queue_id', 'queue_id', { unique: true });
          queueStore.createIndex('table_name', 'table_name', { unique: false });
          queueStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 3. Local Cache Store
        if (!db.objectStoreNames.contains('local_cache')) {
          db.createObjectStore('local_cache', { keyPath: 'composite_key' });
        }

        // 4. Ephemeral Shares Store
        if (!db.objectStoreNames.contains('ephemeral_shares')) {
          const shareStore = db.createObjectStore('ephemeral_shares', { keyPath: 'shareId' });
          shareStore.createIndex('manifestId', 'manifestId', { unique: false });
          shareStore.createIndex('status', 'status', { unique: false });
          shareStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // 5. Cloud Credentials Vault (Sealed via Master KEK)
        if (!db.objectStoreNames.contains('cloud_credentials_vault')) {
          db.createObjectStore('cloud_credentials_vault', { keyPath: 'provider' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Persists a constant-size encrypted chunk payload using its blind content-addressed hash.
   */
  public static async writeChunk(
    chunkHash: string,
    payload: Uint8Array,
    isChaff = false
  ): Promise<string> {
    const db = await this.getDB();
    const fileName = `${chunkHash}.bin`;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.CHUNK_STORE], 'readwrite');
      const store = tx.objectStore(this.CHUNK_STORE);

      // Store binary blob/array alongside blind hash and decoy flag
      const record = {
        chunk_hash: chunkHash,
        file_name: fileName,
        byte_length: payload.byteLength,
        data: payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
        [this.CHAFF_FLAG_KEY]: isChaff,
        stored_at: Date.now(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(fileName);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Reads an encrypted chunk by its blind content-addressed hash.
   */
  public static async readChunk(chunkHash: string): Promise<Uint8Array> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.CHUNK_STORE], 'readonly');
      const store = tx.objectStore(this.CHUNK_STORE);
      const request = store.get(chunkHash);

      request.onsuccess = () => {
        const result = request.result;
        if (!result || !result.data) {
          reject(new Error(`CHUNK_NOT_FOUND: Encrypted block ${chunkHash}.bin does not exist in storage.`));
          return;
        }
        resolve(new Uint8Array(result.data));
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Checks if a chunk exists.
   */
  public static async hasChunk(chunkHash: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise((resolve) => {
      const tx = db.transaction([this.CHUNK_STORE], 'readonly');
      const store = tx.objectStore(this.CHUNK_STORE);
      const request = store.count(chunkHash);

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  }

  /**
   * Deletes a chunk from storage.
   */
  public static async deleteChunk(chunkHash: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.CHUNK_STORE], 'readwrite');
      const store = tx.objectStore(this.CHUNK_STORE);
      const request = store.delete(chunkHash);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Returns counts of authentic chunks vs chaff decoy blocks.
   */
  public static async getStorageMetrics(): Promise<{
    totalBlocks: number;
    authenticChunks: number;
    chaffChunks: number;
    totalBytes: number;
  }> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.CHUNK_STORE], 'readonly');
      const store = tx.objectStore(this.CHUNK_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as Array<{ byte_length: number; is_chaff: boolean }>) || [];
        let authentic = 0;
        let chaff = 0;
        let totalBytes = 0;

        for (const rec of records) {
          totalBytes += rec.byte_length || 0;
          if (rec.is_chaff) chaff++;
          else authentic++;
        }

        resolve({
          totalBlocks: records.length,
          authenticChunks: authentic,
          chaffChunks: chaff,
          totalBytes,
        });
      };

      request.onerror = () => reject(request.error);
    });
  }
}
