/* ============================================================
   SOVEREIGN-OS — Encrypted Client-Side AI Key Registry
   Maintains zero-knowledge persistence for model credentials.
   Keys are sealed at rest via Master KEK and zeroized in RAM.
   ============================================================ */

import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import type { AiProvider, AiProviderConfig } from '../../types';

export class AiKeyStore {
  private static readonly DB_NAME = 'sovereign_ai_vault';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'ai_credentials';

  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('INDEXED_DB_UNAVAILABLE: IndexedDB is not available.'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'provider' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Persists an AI provider configuration.
   * If a plaintext apiKey is provided, it is sealed using EnvelopeCipher with the Master KEK.
   */
  public static async saveProviderConfig(
    provider: AiProvider,
    apiKey: string | null,
    config: Partial<AiProviderConfig>,
    masterKek: CryptoKey
  ): Promise<AiProviderConfig> {
    const db = await this.getDB();

    let encryptedKey = config.encryptedKey;
    if (apiKey && apiKey.trim().length > 0) {
      encryptedKey = await EnvelopeCipher.encryptField<string>(apiKey.trim(), masterKek, {
        workspaceId: 'system_ai',
        recordId: provider,
        fieldName: 'api_key',
        schemaVersion: 1,
      });
    }

    const fullRecord: AiProviderConfig = {
      provider,
      encryptedKey,
      customEndpoint: config.customEndpoint,
      model: config.model || this.getDefaultModelForProvider(provider),
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      aggressivePiiRedaction: config.aggressivePiiRedaction ?? true,
      customKeywords: config.customKeywords ?? [],
      lastTestedLatencyMs: config.lastTestedLatencyMs,
      status: config.status || 'untested',
      errorMessage: config.errorMessage,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.put(fullRecord);

      req.onsuccess = () => resolve(fullRecord);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves all stored provider configurations (with encrypted keys).
   */
  public static async loadAllConfigs(): Promise<Record<AiProvider, AiProviderConfig>> {
    const defaults = this.getDefaultConfigs();
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction([this.STORE_NAME], 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const records = req.result as AiProviderConfig[];
          const result = { ...defaults };
          if (records && records.length > 0) {
            for (const r of records) {
              result[r.provider] = r;
            }
          }
          resolve(result);
        };

        req.onerror = () => {
          resolve(defaults);
        };
      });
    } catch {
      return defaults;
    }
  }

  /**
   * Decrypts the raw API key for a specific provider in volatile RAM using Master KEK.
   * Returns empty string if no key is sealed.
   */
  public static async extractRawApiKey(
    provider: AiProvider,
    masterKek: CryptoKey
  ): Promise<string> {
    const db = await this.getDB();
    const record = await new Promise<AiProviderConfig | undefined>((resolve) => {
      const tx = db.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.get(provider);
      req.onsuccess = () => resolve(req.result as AiProviderConfig);
      req.onerror = () => resolve(undefined);
    });

    if (!record || !record.encryptedKey) {
      return '';
    }

    try {
      const decryptedKey = await EnvelopeCipher.decryptField<string>(record.encryptedKey, masterKek, {
        workspaceId: 'system_ai',
        recordId: provider,
        fieldName: 'api_key',
        schemaVersion: 1,
      });
      return decryptedKey;
    } catch (err) {
      console.warn(`[AI_KEY_STORE] Key unwrap failed for ${provider}:`, err);
      return '';
    }
  }

  /**
   * Purges a provider's credentials from IndexedDB and zeroizes volatile memory.
   */
  public static async purgeProvider(provider: AiProvider): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.delete(provider);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Explicitly wipes a volatile key string array or buffer with zero bytes.
   */
  public static zeroizeKeyBuffer(keyBuffer: Uint8Array | null): void {
    if (keyBuffer) {
      MemorySanitizer.zeroize(keyBuffer);
    }
  }

  public static getDefaultModelForProvider(provider: AiProvider): string {
    switch (provider) {
      case 'GEMINI':
        return 'gemini-2.5-flash';
      case 'CLAUDE':
        return 'claude-3-5-sonnet-20241022';
      case 'OPENAI':
        return 'gpt-4o';
      case 'OLLAMA':
        return 'llama3.2';
    }
  }

  public static getDefaultConfigs(): Record<AiProvider, AiProviderConfig> {
    return {
      GEMINI: {
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 2048,
        aggressivePiiRedaction: true,
        customKeywords: [],
        status: 'untested',
      },
      CLAUDE: {
        provider: 'CLAUDE',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 2048,
        aggressivePiiRedaction: true,
        customKeywords: [],
        status: 'untested',
      },
      OPENAI: {
        provider: 'OPENAI',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2048,
        aggressivePiiRedaction: true,
        customKeywords: [],
        status: 'untested',
      },
      OLLAMA: {
        provider: 'OLLAMA',
        customEndpoint: 'http://localhost:11434',
        model: 'llama3.2',
        temperature: 0.7,
        maxTokens: 2048,
        aggressivePiiRedaction: false,
        customKeywords: [],
        status: 'untested',
      },
    };
  }
}
