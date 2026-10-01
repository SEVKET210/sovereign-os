/* ============================================================
   SOVEREIGN-OS — Supabase Blind Zero-Knowledge Transport Client
   Enforces strict zero-knowledge transmission to self-hosted Supabase / PostgreSQL.
   The remote server receives ONLY encrypted envelopes and blind index hashes.
   Gracefully coordinates with SyncQueueService for offline-first operation.
   ============================================================ */

import { SyncQueueService } from './SyncQueueService';
import type { EncryptedEnvelope, SyncQueueItem } from '../../types';

export interface BlindNodeRecord {
  id: string;
  workspace_id: string;
  clearance_level: number;
  blind_index_tokens: string[];
  encrypted_envelope: EncryptedEnvelope;
  node_signature: string;
  created_at: string;
  updated_at: string;
}

export interface BlindLedgerRecord {
  id: string;
  workspace_id: string;
  blind_vault_tag: string;
  encrypted_tx_envelope: EncryptedEnvelope;
  previous_block_hash: string;
  current_block_hash: string;
  client_signature: string;
  created_at: string;
}

export class SupabaseBlindClient {
  private static readonly SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  private static readonly SUPABASE_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

  /**
   * Persists an encrypted blueprint node.
   * Enqueues into IndexedDB offline queue first (optimistic), then attempts server push.
   */
  public static async upsertEncryptedNode(
    id: string,
    workspaceId: string,
    clearanceLevel: number,
    blindIndexTokens: string[],
    envelope: EncryptedEnvelope,
    signature = 'SIG-CLIENT-ENCLAVE'
  ): Promise<void> {
    const payload = {
      id,
      workspace_id: workspaceId,
      clearance_level: clearanceLevel,
      blind_index_tokens: blindIndexTokens,
      encrypted_envelope: envelope,
      node_signature: signature,
      updated_at: new Date().toISOString(),
    };

    // 1. Optimistic write to IndexedDB cache
    await SyncQueueService.cacheRecord('blind_blueprint_nodes', id, payload);

    // 2. Queue for sequential sync
    const queueItem = await SyncQueueService.enqueue({
      table_name: 'blind_blueprint_nodes',
      operation: 'INSERT',
      record_id: id,
      clearance_level: clearanceLevel,
      blind_index_tokens: blindIndexTokens,
      payload_envelope: envelope,
    });

    // 3. Attempt direct push if online & configured
    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const success = await this.pushToRemote('blind_blueprint_nodes', payload);
        if (success && queueItem.id) {
          await SyncQueueService.markSynced(queueItem.id);
        }
      } catch {
        // Will be drained later via SyncQueueService
      }
    }
  }

  /**
   * Fetches encrypted blueprint nodes filtered by spatial clearance.
   */
  public static async fetchEncryptedNodes(
    workspaceId: string,
    maxClearance = 4
  ): Promise<BlindNodeRecord[]> {
    // 1. Check local cache first
    const cached = await SyncQueueService.getAllCachedRecords<BlindNodeRecord>('blind_blueprint_nodes');
    const localFiltered = cached.filter(
      (node) => node.workspace_id === workspaceId && node.clearance_level <= maxClearance
    );

    // 2. If remote configured, query remote
    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const url = `${this.SUPABASE_URL}/rest/v1/blind_blueprint_nodes?workspace_id=eq.${workspaceId}&clearance_level=lte.${maxClearance}&select=*`;
        const response = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (response.ok) {
          const remoteRecords = (await response.json()) as BlindNodeRecord[];
          for (const rec of remoteRecords) {
            await SyncQueueService.cacheRecord('blind_blueprint_nodes', rec.id, rec);
          }
          return remoteRecords;
        }
      } catch {
        // Fallback to localFiltered
      }
    }

    return localFiltered;
  }

  /**
   * Appends an encrypted block to the blind chained ledger.
   */
  public static async appendEncryptedLedgerBlock(
    id: string,
    workspaceId: string,
    blindVaultTag: string,
    envelope: EncryptedEnvelope,
    previousBlockHash: string,
    currentBlockHash: string,
    signature = 'SIG-CLIENT-CHIEF-AUDITOR'
  ): Promise<void> {
    const payload = {
      id,
      workspace_id: workspaceId,
      blind_vault_tag: blindVaultTag,
      encrypted_tx_envelope: envelope,
      previous_block_hash: previousBlockHash,
      current_block_hash: currentBlockHash,
      client_signature: signature,
      created_at: new Date().toISOString(),
    };

    // 1. Optimistic write to IndexedDB cache
    await SyncQueueService.cacheRecord('blind_chained_ledger', id, payload);

    // 2. Queue for sequential sync
    const queueItem = await SyncQueueService.enqueue({
      table_name: 'blind_chained_ledger',
      operation: 'INSERT',
      record_id: id,
      payload_envelope: envelope,
    });

    // 3. Attempt direct push if online & configured
    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const success = await this.pushToRemote('blind_chained_ledger', payload);
        if (success && queueItem.id) {
          await SyncQueueService.markSynced(queueItem.id);
        }
      } catch {
        // Will be drained later via SyncQueueService
      }
    }
  }

  /**
   * Fetches all encrypted ledger blocks for verification.
   */
  public static async fetchEncryptedLedger(
    workspaceId: string
  ): Promise<BlindLedgerRecord[]> {
    // 1. Check local cache first
    const cached = await SyncQueueService.getAllCachedRecords<BlindLedgerRecord>('blind_chained_ledger');
    const localRecords = cached.filter((r) => r.workspace_id === workspaceId);

    // 2. Query remote if configured
    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const url = `${this.SUPABASE_URL}/rest/v1/blind_chained_ledger?workspace_id=eq.${workspaceId}&order=created_at.asc&select=*`;
        const response = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (response.ok) {
          const remoteRecords = (await response.json()) as BlindLedgerRecord[];
          for (const rec of remoteRecords) {
            await SyncQueueService.cacheRecord('blind_chained_ledger', rec.id, rec);
          }
          return remoteRecords;
        }
      } catch {
        // Fallback to local
      }
    }

    return localRecords;
  }

  /**
   * Queries database using blind index token (exact-match search over encrypted records).
   */
  public static async searchNodesByBlindToken(
    workspaceId: string,
    blindToken: string
  ): Promise<BlindNodeRecord[]> {
    if (this.isRemoteConfigured() && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const url = `${this.SUPABASE_URL}/rest/v1/blind_blueprint_nodes?workspace_id=eq.${workspaceId}&blind_index_tokens=cs.{${blindToken}}&select=*`;
        const response = await fetch(url, {
          method: 'GET',
          headers: this.getHeaders(),
        });
        if (response.ok) {
          return (await response.json()) as BlindNodeRecord[];
        }
      } catch {
        // fall through to local search
      }
    }

    const cached = await SyncQueueService.getAllCachedRecords<BlindNodeRecord>('blind_blueprint_nodes');
    return cached.filter(
      (node) => node.workspace_id === workspaceId && node.blind_index_tokens?.includes(blindToken)
    );
  }

  /**
   * Drains the offline sync queue.
   */
  public static async drainQueue(): Promise<{ processed: number; failed: number }> {
    return SyncQueueService.drainQueue(async (item: SyncQueueItem) => {
      if (!this.isRemoteConfigured()) return true; // Mark as processed in local mode
      return this.pushToRemote(item.table_name, item.payload_envelope);
    });
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

  private static async pushToRemote(tableName: string, payload: unknown): Promise<boolean> {
    const url = `${this.SUPABASE_URL}/rest/v1/${tableName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return response.ok;
  }
}
