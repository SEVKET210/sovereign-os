/* ============================================================
   SOVEREIGN-OS — Double-Entry Ledger Engine
   SHA-256 chained blockchain-style integrity
   ============================================================ */

import { doubleHash, sha256 } from './crypto';

export type EntryType = 'debit' | 'credit' | 'transfer' | 'genesis';

export interface LedgerEntry {
  id: string;
  type: EntryType;
  description: string;
  amount: number;          // in basis points (cents × 100)
  currency: string;
  timestamp: number;       // Unix ms
  debitAccount: string;
  creditAccount: string;
  hash: string;            // SHA-256 of this entry's content
  prevHash: string;        // hash of previous entry
  chainHash: string;       // double-hash of prevHash + hash
  verified: boolean;
}

export interface Ledger {
  id: string;
  name: string;
  created: number;
  entries: LedgerEntry[];
  chainValid: boolean;
}

// ── Genesis Block ─────────────────────────────────────────
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// ── Format amount from basis points ─────────────────────
export function formatAmount(basisPoints: number, currency = 'USD'): string {
  const amount = basisPoints / 10_000;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── Create new ledger ─────────────────────────────────────
export function createLedger(name = 'SOVEREIGN Treasury'): Ledger {
  return {
    id: `ledger_${Date.now()}`,
    name,
    created: Date.now(),
    entries: [],
    chainValid: true,
  };
}

// ── Hash a single entry's content (excluding hash fields) ─
async function hashEntry(
  entry: Omit<LedgerEntry, 'hash' | 'chainHash' | 'verified'>
): Promise<string> {
  const content = JSON.stringify({
    id: entry.id,
    type: entry.type,
    description: entry.description,
    amount: entry.amount,
    currency: entry.currency,
    timestamp: entry.timestamp,
    debitAccount: entry.debitAccount,
    creditAccount: entry.creditAccount,
    prevHash: entry.prevHash,
  });
  return sha256(content);
}

// ── Append a new entry ────────────────────────────────────
export async function appendEntry(
  ledger: Ledger,
  params: {
    type: EntryType;
    description: string;
    amount: number;
    currency?: string;
    debitAccount: string;
    creditAccount: string;
  }
): Promise<Ledger> {
  const prevEntry = ledger.entries[ledger.entries.length - 1];
  const prevHash = prevEntry ? prevEntry.chainHash : GENESIS_HASH;

  const partialEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: params.type,
    description: params.description,
    amount: params.amount,
    currency: params.currency ?? 'USD',
    timestamp: Date.now(),
    debitAccount: params.debitAccount,
    creditAccount: params.creditAccount,
    prevHash,
  };

  const hash = await hashEntry(partialEntry);
  const chainHash = await doubleHash(prevHash + hash);

  const entry: LedgerEntry = {
    ...partialEntry,
    hash,
    chainHash,
    verified: true,
  };

  return {
    ...ledger,
    entries: [...ledger.entries, entry],
  };
}

// ── Verify entire chain integrity ─────────────────────────
export async function verifyChain(ledger: Ledger): Promise<{ valid: boolean; invalidAt: number | null }> {
  let prevHash = GENESIS_HASH;

  for (let i = 0; i < ledger.entries.length; i++) {
    const entry = ledger.entries[i];

    // Check prevHash chain linkage
    if (entry.prevHash !== prevHash) {
      return { valid: false, invalidAt: i };
    }

    // Re-compute hash
    const recomputed = await hashEntry({
      id: entry.id,
      type: entry.type,
      description: entry.description,
      amount: entry.amount,
      currency: entry.currency,
      timestamp: entry.timestamp,
      debitAccount: entry.debitAccount,
      creditAccount: entry.creditAccount,
      prevHash: entry.prevHash,
    });

    if (recomputed !== entry.hash) {
      return { valid: false, invalidAt: i };
    }

    const recomputedChain = await doubleHash(prevHash + entry.hash);
    if (recomputedChain !== entry.chainHash) {
      return { valid: false, invalidAt: i };
    }

    prevHash = entry.chainHash;
  }

  return { valid: true, invalidAt: null };
}

// ── Calculate running balance ─────────────────────────────
export function runningBalance(entries: LedgerEntry[], account: string): number {
  return entries.reduce((balance, entry) => {
    if (entry.creditAccount === account) return balance + entry.amount;
    if (entry.debitAccount === account)  return balance - entry.amount;
    return balance;
  }, 0);
}

// ── Seed demo ledger ─────────────────────────────────────
export async function seedDemoLedger(): Promise<Ledger> {
  let ledger = createLedger('SOVEREIGN Treasury');

  const transactions = [
    { type: 'credit' as EntryType, description: 'Initial Capital Injection', amount: 10_000_000_00, debitAccount: 'external', creditAccount: 'treasury' },
    { type: 'debit' as EntryType,  description: 'Infrastructure Procurement', amount: 1_250_000_00, debitAccount: 'treasury', creditAccount: 'ops' },
    { type: 'credit' as EntryType, description: 'Q3 Revenue — Enterprise Licenses', amount: 3_750_000_00, debitAccount: 'receivables', creditAccount: 'treasury' },
    { type: 'transfer' as EntryType, description: 'Reserve Allocation', amount: 2_000_000_00, debitAccount: 'treasury', creditAccount: 'reserve' },
    { type: 'debit' as EntryType,  description: 'R&D Investment — Crypto Engine', amount: 850_000_00, debitAccount: 'treasury', creditAccount: 'rnd' },
    { type: 'credit' as EntryType, description: 'Strategic Partnership Revenue', amount: 5_000_000_00, debitAccount: 'partnerships', creditAccount: 'treasury' },
    { type: 'debit' as EntryType,  description: 'Compliance & Audit Fees', amount: 125_000_00, debitAccount: 'treasury', creditAccount: 'legal' },
  ];

  for (const tx of transactions) {
    ledger = await appendEntry(ledger, tx);
  }

  return ledger;
}
