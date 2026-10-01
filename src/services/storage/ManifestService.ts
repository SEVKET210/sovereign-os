/* ============================================================
   SOVEREIGN-OS — Encrypted Manifest Architecture & Clearance Masking
   Metadata detachment, envelope encryption, and spatial access isolation.
   Operators below clearance level receive a culled result set with zero placeholders.
   ============================================================ */

import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { BlindIndexEngine } from '../crypto/BlindIndexEngine';
import { SyncQueueService } from '../crypto/SyncQueueService';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import type { FileManifest, ChunkDescriptor, EncryptedEnvelope } from '../../types';

export interface BlindManifestRecord {
  id: string; // UUID v4
  workspace_id: string;
  clearance_level: number;
  blind_search_tokens: string[];
  encrypted_manifest: EncryptedEnvelope;
  manifest_signature: string;
  created_at: string;
  updated_at: string;
}

export class ManifestService {
  private static readonly MANIFEST_STORE = 'blind_vault_manifests';
  private static readonly SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  private static readonly SUPABASE_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

  /**
   * Generates a signed, envelope-encrypted FileManifest and registers it.
   */
  public static async createAndSealManifest(
    fileName: string,
    mimeType: string,
    trueByteLength: number,
    chunks: ChunkDescriptor[],
    clearanceLevel: number,
    workspaceId: string,
    masterKek: CryptoKey,
    blindSalt: Uint8Array,
    customManifestId?: string
  ): Promise<{ manifest: FileManifest; record: BlindManifestRecord }> {
    const manifestId = customManifestId || crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // 1. Calculate client-side integrity signature (HMAC-SHA256 of manifest core)
    const integritySignature = await this.signManifest(
      manifestId,
      fileName,
      trueByteLength,
      chunks,
      clearanceLevel,
      blindSalt
    );

    const manifest: FileManifest = {
      manifestId,
      workspaceId,
      originalFileName: fileName,
      mimeType: mimeType || 'application/octet-stream',
      trueByteLength,
      totalChunks: chunks.length,
      chunkIndex: chunks,
      clearanceLevel,
      createdAt,
      integritySignature,
    };

    // 2. Generate blind search tokens (exact-match searches for file name, mime, tags)
    const blindTokens = await BlindIndexEngine.generateBlindTokensForFields(
      [fileName, mimeType, `clearance_l${clearanceLevel}`, manifestId],
      blindSalt
    );

    // 3. Field-Level Envelope Encryption of the complete manifest
    const encryptedEnvelope = await EnvelopeCipher.sealEnvelope(manifest, masterKek, {
      workspaceId,
      recordId: manifestId,
      fieldName: 'file_manifest',
      schemaVersion: 1,
    });

    const record: BlindManifestRecord = {
      id: manifestId,
      workspace_id: workspaceId,
      clearance_level: clearanceLevel,
      blind_search_tokens: blindTokens,
      encrypted_manifest: encryptedEnvelope,
      manifest_signature: integritySignature,
      created_at: createdAt,
      updated_at: createdAt,
    };

    // 4. Save optimistic local cache & queue to sync
    await SyncQueueService.cacheRecord(this.MANIFEST_STORE, manifestId, record);
    const queueItem = await SyncQueueService.enqueue({
      table_name: this.MANIFEST_STORE as any,
      operation: 'INSERT',
      record_id: manifestId,
      clearance_level: clearanceLevel,
      blind_index_tokens: blindTokens,
      payload_envelope: encryptedEnvelope,
    });

    // 5. Direct push if online & configured
    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch(`${this.SUPABASE_URL}/rest/v1/${this.MANIFEST_STORE}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(record),
        });
        if (res.ok && queueItem.id) {
          await SyncQueueService.markSynced(queueItem.id);
        }
      } catch {
        // Handled via offline sync queue
      }
    }

    return { manifest, record };
  }

  /**
   * Fetches and decrypts manifests with spatial clearance culling.
   * If operator clearance < manifest clearance, the manifest is completely omitted.
   */
  public static async fetchCulledManifests(
    workspaceId: string,
    operatorClearance: number,
    masterKek: CryptoKey
  ): Promise<FileManifest[]> {
    // 1. Check local cache
    const cachedRecords = await SyncQueueService.getAllCachedRecords<BlindManifestRecord>(this.MANIFEST_STORE);
    let records = cachedRecords.filter(
      (r) => r.workspace_id === workspaceId && r.clearance_level <= operatorClearance
    );

    // 2. Query remote if configured
    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const url = `${this.SUPABASE_URL}/rest/v1/${this.MANIFEST_STORE}?workspace_id=eq.${workspaceId}&clearance_level=lte.${operatorClearance}&select=*`;
        const res = await fetch(url, { method: 'GET', headers: this.getHeaders() });
        if (res.ok) {
          const remoteRecords = (await res.json()) as BlindManifestRecord[];
          for (const rec of remoteRecords) {
            await SyncQueueService.cacheRecord(this.MANIFEST_STORE, rec.id, rec);
          }
          records = remoteRecords;
        }
      } catch {
        // Fallback to local cache
      }
    }

    // 3. Decrypt and verify each culled record in volatile memory
    const decryptedManifests: FileManifest[] = [];
    for (const rec of records) {
      // Extra defense-in-depth client check
      if (rec.clearance_level > operatorClearance) continue;

      try {
        const manifest = await EnvelopeCipher.unsealEnvelope<FileManifest>(
          rec.encrypted_manifest,
          masterKek,
          {
            workspaceId: rec.workspace_id,
            recordId: rec.id,
            fieldName: 'file_manifest',
            schemaVersion: 1,
          }
        );
        decryptedManifests.push(manifest);
      } catch (err) {
        console.warn(`[MANIFEST_SERVICE] Decryption failed for manifest ${rec.id}:`, err);
      }
    }

    return decryptedManifests;
  }

  /**
   * Deletes a manifest from cache and server.
   */
  public static async deleteManifest(manifestId: string, workspaceId: string): Promise<void> {
    const db = await SyncQueueService.cacheRecord(this.MANIFEST_STORE, manifestId, null);
    void db;

    await SyncQueueService.enqueue({
      table_name: this.MANIFEST_STORE as any,
      operation: 'DELETE',
      record_id: manifestId,
      payload_envelope: {} as any,
    });

    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await fetch(`${this.SUPABASE_URL}/rest/v1/${this.MANIFEST_STORE}?id=eq.${manifestId}&workspace_id=eq.${workspaceId}`, {
          method: 'DELETE',
          headers: this.getHeaders(),
        });
      } catch {
        // Will sync later
      }
    }
  }

  /**
   * Generates a cryptographic HMAC-SHA256 signature for manifest verification.
   */
  private static async signManifest(
    manifestId: string,
    fileName: string,
    size: number,
    chunks: ChunkDescriptor[],
    clearance: number,
    blindSalt: Uint8Array
  ): Promise<string> {
    const encoder = new TextEncoder();
    const canonical = `${manifestId}|${fileName}|${size}|${chunks.length}|${clearance}`;

    const key = await crypto.subtle.importKey(
      'raw',
      blindSalt as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
    return MemorySanitizer.bytesToHex(new Uint8Array(sig));
  }

  private static isRemoteConfigured(): boolean {
    return Boolean(this.SUPABASE_URL && this.SUPABASE_KEY);
  }

  private static getHeaders(): Record<string, string> {
    return {
      'apikey': this.SUPABASE_KEY,
      'Authorization': `Bearer ${this.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  }
}
