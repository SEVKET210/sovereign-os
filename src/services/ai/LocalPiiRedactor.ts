/* ============================================================
   SOVEREIGN-OS — Local In-Memory PII & Entity Redaction Engine
   Scrubs sensitive identities, network topologies, credentials,
   and confidential corporate keywords before network dispatch.
   ============================================================ */

import type { RedactionResult, RedactedToken } from '../../types';

export class LocalPiiRedactor {
  // Common Pseudonym Pool for Corporate Entities & Codename Substitution
  private static readonly PSEUDONYM_POOL = [
    'PROJECT_DELTA',
    'ENTITY_OMEGA',
    'SECTOR_KAPPA',
    'PROTOCOL_SIGMA',
    'OPERATION_VALKYRIE',
    'VAULT_TITAN',
    'NODE_HELIOS',
    'CLUSTER_NORDIC',
    'ASSET_CYPHER',
    'ENCLAVE_TURING',
  ];

  // Ephemeral session-level pseudonym mapping to ensure contextual consistency within a conversation
  private static sessionMap: Map<string, string> = new Map();
  private static pseudonymIndex = 0;

  /**
   * Resets the ephemeral corporate pseudonym mapping table.
   */
  public static clearSessionMappings(): void {
    this.sessionMap.clear();
    this.pseudonymIndex = 0;
  }

  /**
   * Retrieves or assigns a deterministic tactical pseudonym for a corporate term during the current session.
   */
  private static getOrAssignPseudonym(rawTerm: string): string {
    const normalized = rawTerm.trim().toLowerCase();
    if (this.sessionMap.has(normalized)) {
      return this.sessionMap.get(normalized)!;
    }

    const assigned =
      this.PSEUDONYM_POOL[this.pseudonymIndex % this.PSEUDONYM_POOL.length] +
      (this.pseudonymIndex >= this.PSEUDONYM_POOL.length ? `_${Math.floor(this.pseudonymIndex / this.PSEUDONYM_POOL.length) + 1}` : '');

    this.sessionMap.set(normalized, assigned);
    this.pseudonymIndex++;
    return assigned;
  }

  /**
   * Primary in-memory scrubber.
   * Runs sequentially across regular expressions for emails, IPs, financial IDs, cryptographic tokens,
   * and custom user-specified corporate keywords.
   */
  public static sanitizePrompt(
    rawText: string,
    options: {
      aggressive?: boolean;
      customKeywords?: string[];
    } = {}
  ): RedactionResult {
    if (!rawText) {
      return { sanitizedText: '', redactedCount: 0, tokens: [] };
    }

    let sanitized = rawText;
    const tokens: RedactedToken[] = [];

    // 1. Scrub Custom Corporate Keywords
    if (options.customKeywords && options.customKeywords.length > 0) {
      for (const kw of options.customKeywords) {
        if (!kw || kw.trim().length === 0) continue;
        const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const kwRegex = new RegExp(`\\b${escaped}\\b`, 'gi');

        sanitized = sanitized.replace(kwRegex, (matched) => {
          const replacement = `[${this.getOrAssignPseudonym(matched)}]`;
          tokens.push({
            original: matched,
            replacement,
            category: 'CORPORATE_ENTITY',
          });
          return replacement;
        });
      }
    }

    // 2. Scrub Email Addresses
    // Matches standard RFC 5322-compliant email sequences
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    sanitized = sanitized.replace(emailRegex, (matched) => {
      const replacement = '[OPERATOR_EMAIL_REDACTED]';
      tokens.push({
        original: matched,
        replacement,
        category: 'EMAIL',
      });
      return replacement;
    });

    // 3. Scrub Cryptographic Hashes & Secret Keys
    // Matches 64-char SHA256 hex, 40-char SHA1 hex, 32-char MD5/AES hex, or API key patterns (e.g. sk-..., AIza...)
    const apiKeyRegex = /\b(?:sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35}|ghp_[a-zA-Z0-9]{36})\b/g;
    sanitized = sanitized.replace(apiKeyRegex, (matched) => {
      const replacement = '[CRYPTOGRAPHIC_TOKEN_REDACTED]';
      tokens.push({
        original: matched,
        replacement,
        category: 'CRYPTO_TOKEN',
      });
      return replacement;
    });

    const hexHashRegex = /\b[0-9a-fA-F]{40,64}\b/g;
    sanitized = sanitized.replace(hexHashRegex, (matched) => {
      const replacement = '[CRYPTOGRAPHIC_TOKEN_REDACTED]';
      tokens.push({
        original: matched,
        replacement,
        category: 'CRYPTO_TOKEN',
      });
      return replacement;
    });

    // 4. Scrub Financial Identifiers (IBANs & Credit Card sequences)
    // IBAN: 2 letters + 2 digits + up to 30 alphanumeric characters
    const ibanRegex = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b/g;
    sanitized = sanitized.replace(ibanRegex, (matched) => {
      const replacement = '[FINANCIAL_IDENTIFIER_REDACTED]';
      tokens.push({
        original: matched,
        replacement,
        category: 'FINANCIAL',
      });
      return replacement;
    });

    // Credit Card numbers (13 to 19 digits with optional hyphens/spaces)
    const cardRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b/g;
    sanitized = sanitized.replace(cardRegex, (matched) => {
      const digitsOnly = matched.replace(/\D/g, '');
      if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
        const replacement = '[FINANCIAL_IDENTIFIER_REDACTED]';
        tokens.push({
          original: matched,
          replacement,
          category: 'FINANCIAL',
        });
        return replacement;
      }
      return matched;
    });

    // 5. Scrub IPv4 & IPv6 Addresses
    // IPv4
    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    sanitized = sanitized.replace(ipv4Regex, (matched) => {
      const replacement = '[INTERNAL_IP_REDACTED]';
      tokens.push({
        original: matched,
        replacement,
        category: 'IP_ADDRESS',
      });
      return replacement;
    });

    // IPv6
    const ipv6Regex = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\bfe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}\b/g;
    sanitized = sanitized.replace(ipv6Regex, (matched) => {
      const replacement = '[INTERNAL_IP_REDACTED]';
      tokens.push({
        original: matched,
        replacement,
        category: 'IP_ADDRESS',
      });
      return replacement;
    });

    // 6. Aggressive Mode: Additional scrubs (phone numbers, paths)
    if (options.aggressive) {
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
      sanitized = sanitized.replace(phoneRegex, (matched) => {
        const replacement = '[TELEPHONE_REDACTED]';
        tokens.push({
          original: matched,
          replacement,
          category: 'CORPORATE_ENTITY',
        });
        return replacement;
      });

      const pathRegex = /(?:[A-Za-z]:\\[\w.-]+\\[\w.-\\]+|\/(?:home|etc|var|usr|Users)\/[\w.-]+[\w./-]+)/g;
      sanitized = sanitized.replace(pathRegex, (matched) => {
        const replacement = '[ENCLAVE_SYSTEM_PATH_REDACTED]';
        tokens.push({
          original: matched,
          replacement,
          category: 'CORPORATE_ENTITY',
        });
        return replacement;
      });
    }

    return {
      sanitizedText: sanitized,
      redactedCount: tokens.length,
      tokens,
    };
  }
}
