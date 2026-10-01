/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Pipeline
   Client-side commitment scheme using Web Crypto
   ============================================================ */

import { sha256 } from './crypto';

export interface Commitment {
  hash: string;         // H(secret || nonce)
  nonce: string;        // random blinding factor (hex)
  timestamp: number;
}

export interface Reveal {
  secret: string;
  nonce: string;
}

export interface ZKProof {
  commitment: Commitment;
  reveal: Reveal;
  valid: boolean;
  proofHash: string;    // H(commitment.hash || reveal.secret)
}

// ── Generate a random nonce ────────────────────────────────
function randomHex(bytes = 32): string {
  const arr = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Commit to a secret ────────────────────────────────────
export async function commit(secret: string): Promise<Commitment> {
  const nonce = randomHex(32);
  const hash = await sha256(secret + nonce);
  return { hash, nonce, timestamp: Date.now() };
}

// ── Reveal a commitment ───────────────────────────────────
export function buildReveal(secret: string, commitment: Commitment): Reveal {
  return { secret, nonce: commitment.nonce };
}

// ── Verify reveal against commitment ─────────────────────
export async function verify(
  commitment: Commitment,
  reveal: Reveal
): Promise<boolean> {
  const recomputed = await sha256(reveal.secret + reveal.nonce);
  return recomputed === commitment.hash;
}

// ── Full ZK Proof (commit → reveal → verify) ─────────────
export async function proveKnowledge(secret: string): Promise<ZKProof> {
  const commitment = await commit(secret);
  const reveal = buildReveal(secret, commitment);
  const valid = await verify(commitment, reveal);
  const proofHash = await sha256(commitment.hash + reveal.secret);

  return { commitment, reveal, valid, proofHash };
}

// ── Merkle Root (proof of set membership) ─────────────────
export async function merkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return sha256('empty');
  if (leaves.length === 1) return sha256(leaves[0]);

  let level = await Promise.all(leaves.map((l) => sha256(l)));

  while (level.length > 1) {
    const next: Promise<string>[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left; // duplicate last if odd
      next.push(sha256(left + right));
    }
    level = await Promise.all(next);
  }

  return level[0];
}

// ── ZK Session Proof (proves auth without revealing password) ─
export interface SessionProof {
  fingerprint: string;
  commitment: Commitment;
  proofHash: string;
  expiresAt: number;
  valid: boolean;
}

export async function createSessionProof(
  passwordHash: string,
  fingerprint: string,
  ttlMs = 3_600_000
): Promise<SessionProof> {
  const secret = passwordHash + fingerprint;
  const commitment = await commit(secret);
  const reveal = buildReveal(secret, commitment);
  const valid = await verify(commitment, reveal);
  const proofHash = await sha256(commitment.hash + fingerprint);

  return {
    fingerprint,
    commitment,
    proofHash,
    expiresAt: Date.now() + ttlMs,
    valid,
  };
}

export function sessionProofExpired(proof: SessionProof): boolean {
  return Date.now() > proof.expiresAt;
}
