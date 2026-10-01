/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Persistence & FLEE Manager
   Central orchestrator bridging Blueprint & Treasury subsystems
   with EnvelopeCipher, KeyDerivationBridge, BlindIndexEngine, and SyncQueue
   ============================================================ */

import { KeyDerivationBridge } from './KeyDerivationBridge';
import { EnvelopeCipher } from './EnvelopeCipher';
import { BlindIndexEngine } from './BlindIndexEngine';
import { SupabaseBlindClient } from './SupabaseBlindClient';
import { SyncQueueService } from './SyncQueueService';
import type {
  BlueprintNode,
  ChainedLedgerEntry,
  WorkspaceCryptoContext,
  ZkSyncTelemetry,
  ClearanceLevel,
} from '../../types';

export class ZkPersistenceManager {

  /**
   * Ensures the cryptographic enclave is unlocked with Master KEK in RAM.
   */
  public static async ensureContext(): Promise<WorkspaceCryptoContext> {
    return KeyDerivationBridge.getContext();
  }

  /**
   * Encrypts and persists a Blueprint Node to the zero-knowledge database.
   */
  public static async persistNode(node: BlueprintNode): Promise<void> {
    const ctx = await this.ensureContext();

    // 1. Generate deterministic blind index tokens for exact-match search
    const blindTokens = await BlindIndexEngine.generateBlindTokensForFields(
      [node.title, node.type, node.status, 'assignee' in node ? node.assignee : ''],
      ctx.blindSalt
    );

    // Map clearance level to numeric
    const clearanceNumeric =
      node.clearance === 'LEVEL_1' ? 1 : node.clearance === 'LEVEL_2' ? 2 : node.clearance === 'LEVEL_3' ? 3 : 4;

    // 2. Field-level envelope encryption of the entire node payload
    const envelope = await EnvelopeCipher.sealEnvelope(node, ctx.masterKek, {
      workspaceId: ctx.workspaceId,
      recordId: node.id,
      fieldName: 'node_payload',
      schemaVersion: 1,
    });

    // 3. Dispatch to blind transport client
    await SupabaseBlindClient.upsertEncryptedNode(
      node.id,
      ctx.workspaceId,
      clearanceNumeric,
      blindTokens,
      envelope
    );
  }

  /**
   * Fetches and decrypts all Blueprint Nodes from the zero-knowledge database.
   */
  public static async loadNodes(maxClearance: ClearanceLevel = 'LEVEL_4'): Promise<BlueprintNode[]> {
    const ctx = await this.ensureContext();
    const clearanceNumeric =
      maxClearance === 'LEVEL_1' ? 1 : maxClearance === 'LEVEL_2' ? 2 : maxClearance === 'LEVEL_3' ? 3 : 4;

    const encryptedRecords = await SupabaseBlindClient.fetchEncryptedNodes(
      ctx.workspaceId,
      clearanceNumeric
    );

    const decryptedNodes: BlueprintNode[] = [];
    for (const record of encryptedRecords) {
      try {
        const node = await EnvelopeCipher.unsealEnvelope<BlueprintNode>(
          record.encrypted_envelope,
          ctx.masterKek,
          {
            workspaceId: ctx.workspaceId,
            recordId: record.id,
            fieldName: 'node_payload',
            schemaVersion: 1,
          }
        );
        decryptedNodes.push(node);
      } catch (err) {
        console.warn(`[ZK_MANAGER] Failed to decrypt envelope for node ${record.id}:`, err);
      }
    }

    return decryptedNodes;
  }

  /**
   * Encrypts and appends a transaction block to the blind chained ledger.
   */
  public static async persistLedgerBlock(
    entry: ChainedLedgerEntry
  ): Promise<void> {
    const ctx = await this.ensureContext();

    // 1. Blind the vault identifier
    const blindVaultTag = await BlindIndexEngine.computeBlindToken(entry.vaultId, ctx.blindSalt);

    // 2. Seal transaction payload into encrypted envelope
    const txPayload = {
      index: entry.index,
      timestamp: entry.timestamp,
      vaultId: entry.vaultId,
      amount: entry.amount,
      currency: entry.currency,
      type: entry.type,
      description: entry.description,
      signatory: entry.signatory,
      isOffsetting: entry.isOffsetting,
    };
    const blockId = `blk_${entry.index}_${entry.timestamp}`;
    const envelope = await EnvelopeCipher.sealEnvelope(txPayload, ctx.masterKek, {
      workspaceId: ctx.workspaceId,
      recordId: blockId,
      fieldName: 'ledger_entry',
      schemaVersion: 1,
    });

    // 3. Dispatch to blind client
    await SupabaseBlindClient.appendEncryptedLedgerBlock(
      blockId,
      ctx.workspaceId,
      blindVaultTag,
      envelope,
      entry.prevHash,
      entry.hash,
      entry.signatory
    );
  }

  /**
   * Fetches and decrypts all ledger blocks from the zero-knowledge database.
   */
  public static async loadLedger(): Promise<ChainedLedgerEntry[]> {
    const ctx = await this.ensureContext();
    const encryptedRecords = await SupabaseBlindClient.fetchEncryptedLedger(ctx.workspaceId);

    const entries: ChainedLedgerEntry[] = [];
    for (const record of encryptedRecords) {
      try {
        const payload = await EnvelopeCipher.unsealEnvelope<{
          index: number;
          timestamp: number;
          vaultId: ChainedLedgerEntry['vaultId'];
          amount: number;
          currency: string;
          type: 'CREDIT' | 'DEBIT';
          description: string;
          signatory: string;
          isOffsetting?: boolean;
        }>(record.encrypted_tx_envelope, ctx.masterKek, {
          workspaceId: ctx.workspaceId,
          recordId: record.id,
          fieldName: 'ledger_entry',
          schemaVersion: 1,
        });

        entries.push({
          ...payload,
          prevHash: record.previous_block_hash,
          hash: record.current_block_hash,
        });
      } catch (err) {
        console.warn(`[ZK_MANAGER] Failed to decrypt ledger block ${record.id}:`, err);
      }
    }

    return entries;
  }

  /**
   * Clears all encrypted ledger blocks from the zero-knowledge database/cache.
   */
  public static async clearLedger(): Promise<void> {
    await SyncQueueService.clearTable('blind_chained_ledger');
  }

  /**
   * Returns live cryptographic telemetry for status displays.
   */
  public static async getTelemetry(): Promise<ZkSyncTelemetry> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pendingCount = await SyncQueueService.getPendingCount();
    const isKeyUnlocked = KeyDerivationBridge.isUnlocked();

    return {
      isOnline,
      pendingCount,
      lastSyncTimestamp: Date.now(),
      encryptionEngine: 'AES-256-GCM (FLEE)',
      keyDerivation: 'WebAuthn PRF / PBKDF2 @ 310,000 iter',
      isKeyUnlocked,
    };
  }
}
