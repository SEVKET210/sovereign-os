/* ============================================================
   SOVEREIGN-OS — Deterministic Blind Index Engine
   HMAC-SHA256 tokenization for exact-match zero-knowledge searches
   Enables indexed database lookups without exposing plaintext keywords
   ============================================================ */

import { MemorySanitizer } from './MemorySanitizer';

export class BlindIndexEngine {
  private static readonly TOKEN_PREFIX = 'bidx_';

  /**
   * Generates a single deterministic blind index token for a keyword.
   * HMAC-SHA256(blindSalt, normalizedKeyword) -> "bidx_<64-char hex>"
   */
  public static async computeBlindToken(
    keyword: string,
    blindSalt: Uint8Array
  ): Promise<string> {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return '';

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      blindSalt as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(normalized)
    );

    const tokenHex = MemorySanitizer.bytesToHex(new Uint8Array(signature));
    return `${this.TOKEN_PREFIX}${tokenHex}`;
  }

  /**
   * Tokenizes, cleans, and computes blind index tokens for searchable fields.
   * (e.g. Node titles, tags, assignee names, vault IDs)
   */
  public static async generateBlindTokensForFields(
    fields: Array<string | number | undefined | null>,
    blindSalt: Uint8Array
  ): Promise<string[]> {
    const rawTokens = new Set<string>();

    for (const field of fields) {
      if (field === undefined || field === null) continue;
      const str = String(field).trim().toLowerCase();
      if (!str) continue;

      // Add full phrase
      rawTokens.add(str);

      // Split into alphanumeric tokens (length >= 2)
      const words = str.split(/[\s_\-–—:./,]+/);
      for (const word of words) {
        if (word.length >= 2) {
          rawTokens.add(word);
        }
      }
    }

    const blindTokens: string[] = [];
    for (const token of rawTokens) {
      const bToken = await this.computeBlindToken(token, blindSalt);
      if (bToken) {
        blindTokens.push(bToken);
      }
    }

    return Array.from(new Set(blindTokens));
  }
}
