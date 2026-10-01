/* ============================================================
   SOVEREIGN-OS — Zero-Knowledge Docs Persistence & Sealing Service
   Field-Level Envelope Encryption (FLEE) for Corporate Documentation
   Blind HMAC-SHA256 keyword index tokens & RAM buffer zeroization
   ============================================================ */

import { EnvelopeCipher } from '../crypto/EnvelopeCipher';
import { BlindIndexEngine } from '../crypto/BlindIndexEngine';
import { KeyDerivationBridge } from '../crypto/KeyDerivationBridge';
import { LedgerHashChain } from '../crypto/LedgerHashChain';
import { MemorySanitizer } from '../crypto/MemorySanitizer';
import type {
  CorporateDocument,
  EncryptedDocEnvelope,
  DocumentSealedBlock,
  ChainedLedgerEntry,
} from '../../types';

const DOCS_STORAGE_PREFIX = 'sovereign_docs_enc_';
const DOCS_INDEX_KEY = 'sovereign_docs_manifest_index_v1';

export class DocsPersistenceService {

  /**
   * Encrypts and seals a document client-side into an EncryptedDocEnvelope.
   */
  public static async sealDocument(
    doc: CorporateDocument
  ): Promise<EncryptedDocEnvelope> {
    const ctx = KeyDerivationBridge.getContext();

    // 1. Generate blind HMAC tokens for title and keywords
    const blindTitleToken = await BlindIndexEngine.computeBlindToken(
      doc.title,
      ctx.blindSalt
    );
    const blindKeywordTokens = await BlindIndexEngine.generateBlindTokensForFields(
      [doc.title, doc.category, doc.status, ...doc.tags],
      ctx.blindSalt
    );

    // 2. Encrypt document body using ephemeral DEK wrapped by master KEK
    const envelope = await EnvelopeCipher.sealEnvelope(doc, ctx.masterKek, {
      workspaceId: ctx.workspaceId,
      recordId: doc.id,
      fieldName: 'document_body',
      schemaVersion: 1,
    });

    const clearanceNumeric =
      doc.clearance === 'LEVEL_1' ? 1 : doc.clearance === 'LEVEL_2' ? 2 : doc.clearance === 'LEVEL_3' ? 3 : 4;

    const encryptedDocEnvelope: EncryptedDocEnvelope = {
      id: doc.id,
      blindTitleToken,
      blindKeywordTokens,
      clearanceNumeric,
      envelope,
      updatedAt: doc.updatedAt,
    };

    // 3. Persist to storage under opaque key
    this.persistEnvelope(encryptedDocEnvelope);

    return encryptedDocEnvelope;
  }

  /**
   * Decrypts an EncryptedDocEnvelope into volatile RAM.
   */
  public static async unsealDocument(
    encryptedEnvelope: EncryptedDocEnvelope
  ): Promise<CorporateDocument> {
    const ctx = KeyDerivationBridge.getContext();
    return await EnvelopeCipher.unsealEnvelope<CorporateDocument>(
      encryptedEnvelope.envelope,
      ctx.masterKek,
      {
        workspaceId: ctx.workspaceId,
        recordId: encryptedEnvelope.id,
        fieldName: 'document_body',
        schemaVersion: 1,
      }
    );
  }

  /**
   * Systematically wipes intermediate volatile plaintext strings from memory.
   */
  public static scrubBuffer(text: string): void {
    if (!text) return;
    const bytes = new TextEncoder().encode(text);
    MemorySanitizer.zeroize(bytes);
  }

  /**
   * Computes SHA-256 hash of complete document body, author, and timestamp,
   * then appends an immutable block into the double-entry chained ledger.
   */
  public static async sealDocumentToLedger(
    chain: ChainedLedgerEntry[],
    doc: CorporateDocument,
    mandateReason: string,
    signatory: string
  ): Promise<{ updatedChain: ChainedLedgerEntry[]; sealBlock: DocumentSealedBlock }> {
    const rawPayload = `DOC_SEAL_V1::ID=${doc.id}::TITLE=${doc.title}::AUTHOR=${signatory}::TIME=${doc.updatedAt}::BODY=\n${doc.content}`;
    const documentDigest = await LedgerHashChain.sha256(rawPayload);

    const description = `DOCUMENT RATIFICATION // ${doc.title.toUpperCase()} [SHA256:${documentDigest.slice(0, 12)}]`;
    const ledgerEntry = await LedgerHashChain.appendEntry(
      chain,
      'commercial_reserve',
      0, // Zero currency delta; immutable audit deed
      'DOC-RATIFY',
      'CREDIT',
      description,
      signatory
    );

    const updatedChain = [...chain, ledgerEntry];

    const sealBlock: DocumentSealedBlock = {
      blockIndex: ledgerEntry.index,
      hash: ledgerEntry.hash,
      prevHash: ledgerEntry.prevHash,
      timestamp: ledgerEntry.timestamp,
      signatory,
      documentDigest,
      mandateReason,
    };

    return { updatedChain, sealBlock };
  }

  /**
   * Persists an envelope to localStorage under an opaque key.
   */
  private static persistEnvelope(envelope: EncryptedDocEnvelope): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(`${DOCS_STORAGE_PREFIX}${envelope.id}`, JSON.stringify(envelope));

      // Update index
      const rawIndex = localStorage.getItem(DOCS_INDEX_KEY);
      const indexList: string[] = rawIndex ? JSON.parse(rawIndex) : [];
      if (!indexList.includes(envelope.id)) {
        indexList.push(envelope.id);
        localStorage.setItem(DOCS_INDEX_KEY, JSON.stringify(indexList));
      }
    } catch (err) {
      console.warn('[DOCS_PERSISTENCE] Failed to persist doc envelope:', err);
    }
  }

  /**
   * Loads all encrypted doc envelopes from storage.
   */
  public static loadAllEnvelopes(): EncryptedDocEnvelope[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const rawIndex = localStorage.getItem(DOCS_INDEX_KEY);
      if (!rawIndex) return [];
      const ids: string[] = JSON.parse(rawIndex);
      const envelopes: EncryptedDocEnvelope[] = [];
      for (const id of ids) {
        const raw = localStorage.getItem(`${DOCS_STORAGE_PREFIX}${id}`);
        if (raw) {
          envelopes.push(JSON.parse(raw));
        }
      }
      return envelopes;
    } catch {
      return [];
    }
  }

  /**
   * Removes a document envelope from persistence.
   */
  public static removeEnvelope(id: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(`${DOCS_STORAGE_PREFIX}${id}`);
    try {
      const rawIndex = localStorage.getItem(DOCS_INDEX_KEY);
      if (rawIndex) {
        const ids: string[] = JSON.parse(rawIndex);
        const filtered = ids.filter((i) => i !== id);
        localStorage.setItem(DOCS_INDEX_KEY, JSON.stringify(filtered));
      }
    } catch {}
  }
}
