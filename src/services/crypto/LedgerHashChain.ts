/* ============================================================
   SOVEREIGN-OS — Immutable Chained Ledger Service
   Double-Entry Cryptographic Hash Chain:
   Hash_n = SHA-256(Hash_{n-1} + VaultID + Amount + Timestamp)
   ============================================================ */

import type { ChainedLedgerEntry, VaultId } from '../../types';

export class LedgerHashChain {
  private static encoder = new TextEncoder();
  public static readonly GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Computes SHA-256 string hash via native Web Crypto API
   */
  public static async sha256(data: string): Promise<string> {
    const buffer = await crypto.subtle.digest('SHA-256', this.encoder.encode(data));
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Mathematical chain formula:
   * Hash_n = SHA-256(Hash_{n-1} + VaultID + Amount + Timestamp)
   */
  public static async computeChainedHash(
    prevHash: string,
    vaultId: VaultId,
    amount: number,
    timestamp: number
  ): Promise<string> {
    const rawPayload = `${prevHash}::${vaultId}::${amount}::${timestamp}`;
    return this.sha256(rawPayload);
  }

  /**
   * Appends an entry to the chain, computing the strict cryptographic hash.
   */
  public static async appendEntry(
    chain: ChainedLedgerEntry[],
    vaultId: VaultId,
    amount: number,
    currency: string,
    type: 'CREDIT' | 'DEBIT',
    description: string,
    signatory: string,
    isOffsetting = false
  ): Promise<ChainedLedgerEntry> {
    const index = chain.length;
    const prevHash = index === 0 ? this.GENESIS_PREV_HASH : chain[index - 1].hash;
    const timestamp = Date.now();

    const hash = await this.computeChainedHash(prevHash, vaultId, amount, timestamp);

    return {
      index,
      timestamp,
      vaultId,
      amount,
      currency,
      type,
      description,
      signatory,
      prevHash,
      hash,
      isOffsetting,
    };
  }

  /**
   * Creates an offsetting compensatory ledger transaction to correct an error,
   * preserving the strict immutability mandate.
   */
  public static async createCompensatoryOffset(
    chain: ChainedLedgerEntry[],
    targetEntryIndex: number,
    reason: string,
    signatory: string
  ): Promise<ChainedLedgerEntry | null> {
    const target = chain[targetEntryIndex];
    if (!target) return null;

    const offsetType = target.type === 'CREDIT' ? 'DEBIT' : 'CREDIT';
    const offsetDesc = `COMPENSATORY OFFSET [Entry #${target.index}]: ${reason}`;

    return this.appendEntry(
      chain,
      target.vaultId,
      target.amount,
      target.currency,
      offsetType,
      offsetDesc,
      signatory,
      true
    );
  }

  /**
   * Mathematically verifies the unbroken integrity of the ledger chain.
   */
  public static async verifyChain(chain: ChainedLedgerEntry[]): Promise<{
    isValid: boolean;
    brokenAtBlock?: number;
    verifiedEntriesCount: number;
    headHash: string;
  }> {
    if (!chain || chain.length === 0) {
      return { isValid: true, verifiedEntriesCount: 0, headHash: this.GENESIS_PREV_HASH };
    }

    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i];
      const expectedPrev = i === 0 ? this.GENESIS_PREV_HASH : chain[i - 1].hash;

      if (entry.prevHash !== expectedPrev) {
        return { isValid: false, brokenAtBlock: i, verifiedEntriesCount: i, headHash: entry.hash };
      }

      const recomputed = await this.computeChainedHash(
        entry.prevHash,
        entry.vaultId,
        entry.amount,
        entry.timestamp
      );

      if (entry.hash !== recomputed) {
        return { isValid: false, brokenAtBlock: i, verifiedEntriesCount: i, headHash: entry.hash };
      }
    }

    return {
      isValid: true,
      verifiedEntriesCount: chain.length,
      headHash: chain[chain.length - 1].hash,
    };
  }

  /**
   * Initializes clean institutional ledger entries. Returns empty array for genuine initial state.
   */
  public static async seedInstitutionalLedger(): Promise<ChainedLedgerEntry[]> {
    return [];
  }
}
