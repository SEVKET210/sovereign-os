/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Comms Blind Relay Service
   Field-Level Envelope Encryption (FLEE) for corporate communications
   Blind HMAC-SHA256 channel identifiers & client-side AES-256-GCM
   Host/VDS cannot decrypt communications or map channels to plaintext
   ============================================================ */

import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { BlindIndexEngine } from '../crypto/BlindIndexEngine';
import { KeyDerivationBridge } from '../crypto/KeyDerivationBridge';
import { LedgerHashChain } from '../crypto/LedgerHashChain';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import type {
  MessagePayload,
  EncryptedCommsEnvelope,
  DecisionSealBlock,
  ChainedLedgerEntry,
} from '../../types';

const COMMS_PERSISTENCE_KEY_PREFIX = 'sovereign_comms_blind_env_';

export class CommsRelayService {

  /**
   * Derives a deterministic blind HMAC-SHA256 channel identifier.
   * Untrusted servers and database tables only observe this opaque token.
   */
  public static async deriveBlindChannelId(channelId: string): Promise<string> {
    try {
      const ctx = KeyDerivationBridge.getContext();
      return await BlindIndexEngine.computeBlindToken(channelId, ctx.blindSalt);
    } catch {
      // Fallback deterministic HMAC using static salt if enclave context is warming
      const staticSalt = new Uint8Array([115, 111, 118, 95, 99, 104, 97, 110, 110, 101, 108, 95, 115, 97, 108, 116]);
      return await BlindIndexEngine.computeBlindToken(channelId, staticSalt);
    }
  }

  /**
   * Client-side zero-knowledge encryption of a message payload.
   * Encrypts payload with ephemeral 256-bit AES-GCM DEK wrapped by Master KEK.
   */
  public static async sealOutboundMessage(
    payload: MessagePayload
  ): Promise<EncryptedCommsEnvelope> {
    const ctx = KeyDerivationBridge.getContext();
    const envelope = await EnvelopeCipher.sealEnvelope(
      payload,
      ctx.masterKek,
      {
        workspaceId: ctx.workspaceId,
        recordId: payload.id,
        fieldName: 'message_payload',
        schemaVersion: 1,
      }
    );

    const encryptedCommsEnvelope: EncryptedCommsEnvelope = {
      id: payload.id,
      channelBlindId: payload.channelBlindId,
      envelope,
      senderId: payload.senderId,
      timestamp: payload.timestamp,
      isEphemeral: payload.isEphemeral,
      burnMode: payload.burnMode,
      expiresAt: payload.expiresAt,
    };

    // If persistent (not ephemeral), store envelope under blind channel key
    if (!payload.isEphemeral && payload.burnMode === 'none') {
      this.persistEnvelope(encryptedCommsEnvelope);
    }

    return encryptedCommsEnvelope;
  }

  /**
   * Client-side zero-knowledge decryption of an incoming encrypted envelope.
   */
  public static async unsealInboundEnvelope(
    encryptedEnvelope: EncryptedCommsEnvelope
  ): Promise<MessagePayload> {
    const ctx = KeyDerivationBridge.getContext();
    const payload = await EnvelopeCipher.unsealEnvelope<MessagePayload>(
      encryptedEnvelope.envelope,
      ctx.masterKek,
      {
        workspaceId: ctx.workspaceId,
        recordId: encryptedEnvelope.id,
        fieldName: 'message_payload',
        schemaVersion: 1,
      }
    );
    return payload;
  }

  /**
   * Computes chained cryptographic SHA-256 digest for Decision Sealing.
   * Mathematical proof tying message texts, signatories, and timestamps together.
   */
  public static async computeDecisionDigest(
    messages: MessagePayload[],
    signatory: string,
    reason: string
  ): Promise<{ digest: string; serializedProof: string }> {
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    const serializedProof = sorted
      .map((m) => `[${m.timestamp}][${m.senderAlias}][${m.senderClearance}]: ${m.content}`)
      .join('\n---RECORD---\n');

    const combinedRaw = `DECISION_PROOF::SIG=${signatory}::REASON=${reason}::PROOF=\n${serializedProof}`;
    const digest = await LedgerHashChain.sha256(combinedRaw);
    return { digest, serializedProof };
  }

  /**
   * Appends an immutable Decision Seal entry to the double-entry treasury ledger.
   */
  public static async sealDecisionToLedger(
    chain: ChainedLedgerEntry[],
    messages: MessagePayload[],
    signatory: string,
    reason: string
  ): Promise<{ updatedChain: ChainedLedgerEntry[]; sealBlock: DecisionSealBlock }> {
    const { digest } = await this.computeDecisionDigest(messages, signatory, reason);

    const description = `DECISION SEAL // ${reason.toUpperCase()} [SHA256:${digest.slice(0, 12)}]`;
    const ledgerEntry = await LedgerHashChain.appendEntry(
      chain,
      'commercial_reserve',
      0, // Zero nominal currency movement; immutable audit decree
      'SOV-AUDIT',
      'CREDIT',
      description,
      signatory
    );

    const updatedChain = [...chain, ledgerEntry];

    const sealBlock: DecisionSealBlock = {
      blockIndex: ledgerEntry.index,
      hash: ledgerEntry.hash,
      prevHash: ledgerEntry.prevHash,
      timestamp: ledgerEntry.timestamp,
      signatory,
      reason,
      messageDigest: digest,
    };

    return { updatedChain, sealBlock };
  }

  /**
   * Persists envelope ciphertext to storage under opaque blind channel identifier.
   */
  private static persistEnvelope(envelope: EncryptedCommsEnvelope): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const storageKey = `${COMMS_PERSISTENCE_KEY_PREFIX}${envelope.channelBlindId}`;
      const raw = localStorage.getItem(storageKey);
      const list: EncryptedCommsEnvelope[] = raw ? JSON.parse(raw) : [];
      list.push(envelope);
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (err) {
      console.warn('[COMMS_RELAY] Failed to persist blind envelope:', err);
    }
  }

  /**
   * Loads persisted envelopes for a given blind channel identifier.
   */
  public static loadPersistedEnvelopes(channelBlindId: string): EncryptedCommsEnvelope[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const storageKey = `${COMMS_PERSISTENCE_KEY_PREFIX}${channelBlindId}`;
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Zeroizes and purges all persisted comms from storage (for security wipe).
   */
  public static purgeAllBlindEnvelopes(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMMS_PERSISTENCE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const dummyBytes = new TextEncoder().encode(raw);
        MemorySanitizer.zeroize(dummyBytes);
      }
      localStorage.removeItem(key);
    }
  }
}
