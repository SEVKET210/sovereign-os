/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge BYOS Cloud Credential Enclave
   Seals and unseals third-party cloud credentials (AWS Access Keys,
   Cloudflare R2 tokens, MinIO keys, Google Drive OAuth tokens, WebDAV passwords)
   inside client-side IndexedDB using authenticated AES-256-GCM via Master KEK.
   Guarantees zero unencrypted credential transmission to VDS or intermediate servers.
   ============================================================ */

import { StorageAdapter } from './StorageAdapter';
import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import type {
  StorageEndpoint,
  CloudProviderCredentials,
  CloudProviderConfig,
  EncryptedEnvelope,
} from '../../types';

export class ByosCredentialEnclave {
  private static readonly STORE_NAME = 'cloud_credentials_vault';
  private static readonly LOCAL_STORAGE_FALLBACK_PREFIX = 'sovereign_byos_cred_enc_';

  // In-memory cache of unsealed credentials during active session
  private static inMemoryCredentials: Partial<Record<StorageEndpoint, CloudProviderCredentials>> = {};

  /**
   * Seals and saves cloud credentials for a given provider.
   * Credentials payload is converted to an authenticated AES-256-GCM envelope using the Master KEK.
   */
  public static async sealAndSaveCredentials(
    provider: StorageEndpoint,
    credentials: CloudProviderCredentials,
    masterKek: CryptoKey
  ): Promise<EncryptedEnvelope> {
    // 1. Seal credentials into zero-knowledge envelope
    const envelope = await EnvelopeCipher.sealEnvelope<CloudProviderCredentials>(
      credentials,
      masterKek,
      {
        workspaceId: 'system_byos',
        recordId: provider,
        fieldName: 'cloud_credentials',
        schemaVersion: 1,
      }
    );

    // 2. Cache in volatile memory for active session
    this.inMemoryCredentials[provider] = { ...credentials };

    // 3. Persist to IndexedDB
    try {
      const db = await StorageAdapter.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([this.STORE_NAME], 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const record = {
          provider,
          envelope,
          updatedAt: Date.now(),
        };
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage if IndexedDB is in middle of upgrade
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          `${this.LOCAL_STORAGE_FALLBACK_PREFIX}${provider}`,
          JSON.stringify(envelope)
        );
      }
    }

    return envelope;
  }

  /**
   * Loads and unseals credentials for a given provider using the Master KEK.
   */
  public static async loadAndUnsealCredentials(
    provider: StorageEndpoint,
    masterKek: CryptoKey
  ): Promise<CloudProviderCredentials | null> {
    // 1. Check in-memory session cache first
    if (this.inMemoryCredentials[provider]) {
      return this.inMemoryCredentials[provider]!;
    }

    let envelope: EncryptedEnvelope | null = null;

    // 2. Retrieve from IndexedDB
    try {
      const db = await StorageAdapter.getDB();
      envelope = await new Promise<EncryptedEnvelope | null>((resolve) => {
        const tx = db.transaction([this.STORE_NAME], 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(provider);
        req.onsuccess = () => {
          if (req.result && req.result.envelope) {
            resolve(req.result.envelope);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      // Fallback read
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(`${this.LOCAL_STORAGE_FALLBACK_PREFIX}${provider}`);
        if (raw) {
          try {
            envelope = JSON.parse(raw);
          } catch {
            envelope = null;
          }
        }
      }
    }

    if (!envelope) {
      return null;
    }

    // 3. Unseal envelope with Master KEK
    try {
      const unsealed = await EnvelopeCipher.unsealEnvelope<CloudProviderCredentials>(
        envelope,
        masterKek,
        {
          workspaceId: 'system_byos',
          recordId: provider,
          fieldName: 'cloud_credentials',
          schemaVersion: 1,
        }
      );
      this.inMemoryCredentials[provider] = unsealed;
      return unsealed;
    } catch (err) {
      console.warn(`[BYOS_ENCLAVE] Failed to unseal credentials for ${provider}:`, err);
      return null;
    }
  }

  /**
   * Directly sets volatile in-memory credentials for temporary probes and drills.
   */
  public static setVolatileCredentials(
    provider: StorageEndpoint,
    credentials: CloudProviderCredentials
  ): void {
    this.inMemoryCredentials[provider] = { ...credentials };
  }

  /**
   * Retrieves active in-memory credentials without unsealing from disk.
   */
  public static getInMemoryCredentials(
    provider: StorageEndpoint
  ): CloudProviderCredentials | null {
    return this.inMemoryCredentials[provider] || null;
  }

  /**
   * Purges sealed credentials from IndexedDB and volatile memory.
   */
  public static async purgeCredentials(provider: StorageEndpoint): Promise<void> {
    delete this.inMemoryCredentials[provider];

    try {
      const db = await StorageAdapter.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([this.STORE_NAME], 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.delete(provider);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${this.LOCAL_STORAGE_FALLBACK_PREFIX}${provider}`);
    }
  }

  /**
   * Sanitizes all volatile credentials in memory.
   */
  public static zeroizeVolatileCredentials(): void {
    for (const key of Object.keys(this.inMemoryCredentials)) {
      const p = key as StorageEndpoint;
      const creds = this.inMemoryCredentials[p];
      if (creds) {
        creds.secretAccessKey = '';
        creds.googleDriveAccessToken = '';
        creds.webdavPassword = '';
        creds.accessKeyId = '';
      }
    }
    this.inMemoryCredentials = {};
  }

  /**
   * Default configuration for storage providers.
   */
  public static getDefaultConfig(provider: StorageEndpoint): CloudProviderConfig {
    switch (provider) {
      case 'AWS_S3':
        return {
          provider: 'AWS_S3',
          endpointUrl: 'https://s3.us-east-1.amazonaws.com',
          bucketName: 'sovereign-vault-enclave',
          region: 'us-east-1',
          enabled: true,
          status: 'DISCONNECTED',
        };
      case 'CLOUDFLARE_R2':
        return {
          provider: 'CLOUDFLARE_R2',
          endpointUrl: 'https://<account_id>.r2.cloudflarestorage.com',
          bucketName: 'enterprise-enclave-vault-01',
          region: 'auto',
          enabled: true,
          status: 'DISCONNECTED',
        };
      case 'MINIO':
        return {
          provider: 'MINIO',
          endpointUrl: 'http://localhost:9000',
          bucketName: 'sovereign-minio-enclave',
          region: 'us-east-1',
          enabled: true,
          status: 'DISCONNECTED',
        };
      case 'GOOGLE_DRIVE':
        return {
          provider: 'GOOGLE_DRIVE',
          endpointUrl: 'https://www.googleapis.com/drive/v3',
          bucketName: 'Sovereign-OS Enclave Folder',
          region: 'global',
          enabled: true,
          status: 'DISCONNECTED',
        };
      case 'WEBDAV':
        return {
          provider: 'WEBDAV',
          endpointUrl: 'https://dav.sovereign-vault.corp/remote.php/webdav',
          bucketName: 'vault_chunks',
          region: 'global',
          enabled: true,
          status: 'DISCONNECTED',
        };
      case 'VDS_LOCAL':
      default:
        return {
          provider: 'VDS_LOCAL',
          endpointUrl: 'local://indexeddb/chunk_storage',
          bucketName: 'vds_local_enclave',
          region: 'localhost',
          enabled: true,
          status: 'CONNECTED',
        };
    }
  }
}
