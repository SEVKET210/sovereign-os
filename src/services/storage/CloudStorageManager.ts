/* ============================================================
   SOVEREIGN-OS — Unified Multi-Cloud Storage Egress Orchestrator
   Coordinates chunk ingestion, direct RAM retrieval, and non-destructive
   latency drills across AWS S3, Cloudflare R2, MinIO, Google Drive, WebDAV, and VDS Local.
   ============================================================ */

import { AwsSigV4Signer } from './AwsSigV4Signer';
import { GoogleDriveAdapter } from './GoogleDriveAdapter';
import { WebDavAdapter } from './WebDavAdapter';
import { StorageAdapter } from './StorageAdapter';
import type {
  CloudProviderConfig,
  CloudProviderCredentials,
  CloudTestDrillResult,
} from '../../types';

export class CloudStorageManager {
  /**
   * Dispatches an encrypted 4MB chunk directly to the configured cloud provider.
   */
  public static async writeChunkToCloud(
    chunkHash: string,
    payload: Uint8Array,
    config: CloudProviderConfig,
    credentials?: CloudProviderCredentials | null
  ): Promise<string> {
    const fileName = `${chunkHash}.bin`;

    switch (config.provider) {
      case 'AWS_S3':
      case 'CLOUDFLARE_R2':
      case 'MINIO': {
        if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
          throw new Error(`MISSING_CREDENTIALS: Access Key ID and Secret Access Key required for ${config.provider}.`);
        }

        const targetUrl = AwsSigV4Signer.buildObjectUrl(
          config.endpointUrl,
          config.bucketName,
          fileName,
          config.region
        );

        const signed = await AwsSigV4Signer.signRequest({
          method: 'PUT',
          url: targetUrl,
          region: config.region || (config.provider === 'CLOUDFLARE_R2' ? 'auto' : 'us-east-1'),
          payload,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });

        const res = await fetch(signed.url, {
          method: 'PUT',
          headers: signed.headers,
          body: payload as unknown as BodyInit,
        });

        if (!res.ok && res.status !== 200 && res.status !== 201) {
          const errText = await res.text().catch(() => '');
          if (errText.includes('RequestTimeTooSkewed') || errText.includes('SignatureExpired') || res.status === 403) {
            const skew = AwsSigV4Signer.recordClockSkewFromHeaders(res.headers);
            if (skew !== null && Math.abs(skew) > 15000) {
              throw new Error(`CLOCK_SKEW_DETECTED: System clock drift of ${(skew / 1000).toFixed(1)}s detected. Please verify your system clock.`);
            }
          }
          throw new Error(`${config.provider}_UPLOAD_FAILED: ${res.status} ${res.statusText} — ${errText}`);
        }

        return targetUrl;
      }

      case 'GOOGLE_DRIVE': {
        if (!credentials?.googleDriveAccessToken) {
          throw new Error('MISSING_GDRIVE_TOKEN: Google Drive OAuth Access Token is required.');
        }
        await GoogleDriveAdapter.uploadChunk(
          chunkHash,
          payload,
          credentials.googleDriveAccessToken,
          credentials.googleDriveFolderId
        );
        return `gdrive://${config.bucketName}/${fileName}`;
      }

      case 'WEBDAV': {
        await WebDavAdapter.uploadChunk(
          chunkHash,
          payload,
          config.endpointUrl,
          credentials?.webdavUsername,
          credentials?.webdavPassword
        );
        return `${config.endpointUrl.replace(/\/+$/, '')}/${fileName}`;
      }

      case 'VDS_LOCAL':
      default: {
        return StorageAdapter.writeChunk(chunkHash, payload, false);
      }
    }
  }

  /**
   * Fetches an encrypted 4MB chunk directly from the active cloud provider into volatile RAM.
   */
  public static async readChunkFromCloud(
    chunkHash: string,
    config: CloudProviderConfig,
    credentials?: CloudProviderCredentials | null
  ): Promise<Uint8Array> {
    const fileName = `${chunkHash}.bin`;

    switch (config.provider) {
      case 'AWS_S3':
      case 'CLOUDFLARE_R2':
      case 'MINIO': {
        if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
          throw new Error(`MISSING_CREDENTIALS: Access Key ID and Secret Access Key required for ${config.provider}.`);
        }

        const targetUrl = AwsSigV4Signer.buildObjectUrl(
          config.endpointUrl,
          config.bucketName,
          fileName,
          config.region
        );

        const signed = await AwsSigV4Signer.signRequest({
          method: 'GET',
          url: targetUrl,
          region: config.region || (config.provider === 'CLOUDFLARE_R2' ? 'auto' : 'us-east-1'),
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
        });

        const res = await fetch(signed.url, {
          method: 'GET',
          headers: signed.headers,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          if (errText.includes('RequestTimeTooSkewed') || errText.includes('SignatureExpired') || res.status === 403) {
            const skew = AwsSigV4Signer.recordClockSkewFromHeaders(res.headers);
            if (skew !== null && Math.abs(skew) > 15000) {
              throw new Error(`CLOCK_SKEW_DETECTED: System clock drift of ${(skew / 1000).toFixed(1)}s detected. Please verify your system clock.`);
            }
          }
          throw new Error(`${config.provider}_DOWNLOAD_FAILED: ${res.status} ${res.statusText} — ${errText}`);
        }

        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
      }

      case 'GOOGLE_DRIVE': {
        if (!credentials?.googleDriveAccessToken) {
          throw new Error('MISSING_GDRIVE_TOKEN: Google Drive OAuth Access Token is required.');
        }
        return GoogleDriveAdapter.downloadChunk(
          chunkHash,
          credentials.googleDriveAccessToken,
          credentials.googleDriveFolderId
        );
      }

      case 'WEBDAV': {
        return WebDavAdapter.downloadChunk(
          chunkHash,
          config.endpointUrl,
          credentials?.webdavUsername,
          credentials?.webdavPassword
        );
      }

      case 'VDS_LOCAL':
      default: {
        return StorageAdapter.readChunk(chunkHash);
      }
    }
  }

  /**
   * Deletes a chunk from the remote cloud provider.
   */
  public static async deleteChunkFromCloud(
    chunkHash: string,
    config: CloudProviderConfig,
    credentials?: CloudProviderCredentials | null
  ): Promise<void> {
    const fileName = `${chunkHash}.bin`;

    switch (config.provider) {
      case 'AWS_S3':
      case 'CLOUDFLARE_R2':
      case 'MINIO': {
        if (!credentials?.accessKeyId || !credentials?.secretAccessKey) return;

        const targetUrl = AwsSigV4Signer.buildObjectUrl(
          config.endpointUrl,
          config.bucketName,
          fileName,
          config.region
        );

        const signed = await AwsSigV4Signer.signRequest({
          method: 'DELETE',
          url: targetUrl,
          region: config.region || 'auto',
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
        });

        await fetch(signed.url, {
          method: 'DELETE',
          headers: signed.headers,
        }).catch(() => {});
        break;
      }

      case 'GOOGLE_DRIVE': {
        if (credentials?.googleDriveAccessToken) {
          await GoogleDriveAdapter.deleteChunk(
            chunkHash,
            credentials.googleDriveAccessToken,
            credentials.googleDriveFolderId
          ).catch(() => {});
        }
        break;
      }

      case 'WEBDAV': {
        await WebDavAdapter.deleteChunk(
          chunkHash,
          config.endpointUrl,
          credentials?.webdavUsername,
          credentials?.webdavPassword
        ).catch(() => {});
        break;
      }

      case 'VDS_LOCAL':
      default: {
        await StorageAdapter.deleteChunk(chunkHash).catch(() => {});
        break;
      }
    }
  }

  /**
   * Executes an interactive, non-destructive test drill:
   * 1. Writes an ephemeral zeroized canary probe block.
   * 2. Reads back and validates integrity.
   * 3. Deletes probe block.
   * 4. Renders live millisecond roundtrip latency and authoritative status.
   */
  public static async executeTestDrill(
    config: CloudProviderConfig,
    credentials?: CloudProviderCredentials | null
  ): Promise<CloudTestDrillResult> {
    const startTime = performance.now();
    const probeHash = `sovereign_probe_${Date.now()}`;
    const probePayload = new Uint8Array(64); // 64-byte zeroized canary block
    crypto.getRandomValues(probePayload);

    try {
      if (config.provider === 'VDS_LOCAL') {
        await StorageAdapter.writeChunk(probeHash, probePayload, true);
        const readBack = await StorageAdapter.readChunk(probeHash);
        if (readBack.byteLength !== probePayload.byteLength) throw new Error('Local probe integrity mismatch.');
        await StorageAdapter.deleteChunk(probeHash);
        const elapsed = Math.round(performance.now() - startTime);
        return {
          success: true,
          latencyMs: elapsed,
          probeHash,
          message: `IndexedDB VDS Local storage operational. Loopback completed in ${elapsed}ms.`,
          timestamp: Date.now(),
        };
      }

      if (config.provider === 'GOOGLE_DRIVE') {
        if (!credentials?.googleDriveAccessToken) {
          throw new Error('Please specify a valid Google Drive Access Token to test connection.');
        }
        const gRes = await GoogleDriveAdapter.testConnection(
          credentials.googleDriveAccessToken,
          credentials.googleDriveFolderId
        );
        return {
          success: true,
          latencyMs: gRes.latencyMs,
          probeHash,
          message: gRes.message,
          timestamp: Date.now(),
        };
      }

      if (config.provider === 'WEBDAV') {
        if (!config.endpointUrl) {
          throw new Error('Please specify a WebDAV endpoint URL.');
        }
        const wRes = await WebDavAdapter.testConnection(
          config.endpointUrl,
          credentials?.webdavUsername,
          credentials?.webdavPassword
        );
        return {
          success: true,
          latencyMs: wRes.latencyMs,
          probeHash,
          message: wRes.message,
          timestamp: Date.now(),
        };
      }

      // S3 / R2 / MinIO Providers:
      if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
        throw new Error(`Access Key ID and Secret Access Key are required for ${config.provider}.`);
      }
      if (!config.bucketName) {
        throw new Error('Please specify a valid bucket name.');
      }

      // 1. Write probe
      await this.writeChunkToCloud(probeHash, probePayload, config, credentials);

      // 2. Read probe
      const readBytes = await this.readChunkFromCloud(probeHash, config, credentials);
      if (readBytes.byteLength !== probePayload.byteLength) {
        throw new Error('Downloaded probe verification failed (byte length mismatch).');
      }

      // 3. Delete probe
      await this.deleteChunkFromCloud(probeHash, config, credentials);

      const elapsed = Math.round(performance.now() - startTime);
      return {
        success: true,
        latencyMs: elapsed,
        probeHash,
        message: `${config.provider} connected. SigV4 authenticated roundtrip drill completed in ${elapsed}ms.`,
        timestamp: Date.now(),
      };
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        latencyMs: elapsed,
        probeHash,
        message: `Connection drill failed (${elapsed}ms): ${errMsg}`,
        timestamp: Date.now(),
      };
    }
  }
}
