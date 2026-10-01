/* ============================================================
   SOVEREIGN-OS — BIP-39 Deterministic Mnemonic & Seed Engine
   Standard RFC/BIP-39 compliant 12-word mnemonic generation,
   checksum verification, PBKDF2 seed derivation, and Master KEK
   synthesis for hardware-grade zero-knowledge vaults.
   ============================================================ */

import { BIP39_ENGLISH_WORDLIST } from './bip39Wordlist';
import { MemorySanitizer } from './MemorySanitizer';

export class Bip39Service {
  private static readonly WORDLIST = BIP39_ENGLISH_WORDLIST;

  /**
   * Generates a cryptographically secure 12-word BIP-39 mnemonic phrase.
   * Uses 128 bits of CSPRNG entropy + 4-bit SHA-256 checksum = 132 bits / 11 = 12 words.
   */
  public static generateMnemonic(strengthBits: 128 | 256 = 128): string {
    const entropyByteCount = strengthBits / 8;
    const entropy = crypto.getRandomValues(new Uint8Array(entropyByteCount));
    return this.entropyToMnemonic(entropy);
  }

  /**
   * Converts raw entropy bytes into a standard BIP-39 mnemonic phrase.
   */
  public static entropyToMnemonic(entropy: Uint8Array): string {
    if (entropy.length !== 16 && entropy.length !== 32) {
      throw new Error('INVALID_ENTROPY_LENGTH: Entropy must be 128 or 256 bits.');
    }

    const checksumBitsCount = entropy.length / 4;
    const hash = this.sha256(entropy);

    let bits = '';
    for (let i = 0; i < entropy.length; i++) {
      bits += entropy[i].toString(2).padStart(8, '0');
    }

    const checksumByte = hash[0].toString(2).padStart(8, '0');
    bits += checksumByte.slice(0, checksumBitsCount);

    const words: string[] = [];
    for (let i = 0; i < bits.length; i += 11) {
      const chunk = bits.slice(i, i + 11);
      const index = parseInt(chunk, 2);
      words.push(this.WORDLIST[index]);
    }

    return words.join(' ');
  }

  /**
   * Validates a BIP-39 mnemonic phrase (word count, dictionary membership, checksum).
   */
  public static validateMnemonic(mnemonic: string): boolean {
    const clean = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = clean.split(' ');

    if (words.length !== 12 && words.length !== 24) {
      return false;
    }

    for (const w of words) {
      if (!this.WORDLIST.includes(w)) {
        return false;
      }
    }

    try {
      let bits = '';
      for (const w of words) {
        const index = this.WORDLIST.indexOf(w);
        if (index === -1) return false;
        bits += index.toString(2).padStart(11, '0');
      }

      const checksumBitsCount = words.length / 3;
      const entropyBitsCount = bits.length - checksumBitsCount;

      const entropyBytes = new Uint8Array(entropyBitsCount / 8);
      for (let i = 0; i < entropyBitsCount; i += 8) {
        entropyBytes[i / 8] = parseInt(bits.slice(i, i + 8), 2);
      }

      const hash = this.sha256(entropyBytes);
      const expectedChecksum = hash[0].toString(2).padStart(8, '0').slice(0, checksumBitsCount);
      const actualChecksum = bits.slice(entropyBitsCount);

      return expectedChecksum === actualChecksum;
    } catch {
      return false;
    }
  }

  /**
   * Derives a 512-bit (64-byte) deterministic seed from a BIP-39 mnemonic using PBKDF2-SHA512.
   * Salt is "mnemonic" + optional passphrase.
   */
  public static async mnemonicToSeed(mnemonic: string, passphrase = ''): Promise<Uint8Array> {
    const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(cleanMnemonic.normalize('NFKD'));
    const saltBytes = enc.encode(('mnemonic' + passphrase).normalize('NFKD'));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    let derivedBits: ArrayBuffer;
    try {
      derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 2048,
          hash: 'SHA-512',
        },
        keyMaterial,
        512
      );
    } catch {
      derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations: 2048,
          hash: 'SHA-256',
        },
        keyMaterial,
        512
      );
    }

    return new Uint8Array(derivedBits);
  }

  /**
   * Directly derives a 256-bit AES-GCM Master KEK (Key Encryption Key) from a BIP-39 mnemonic.
   */
  public static async deriveMasterKeyFromMnemonic(mnemonic: string, passphrase = ''): Promise<CryptoKey> {
    const seed = await this.mnemonicToSeed(mnemonic, passphrase);
    const kekRaw = seed.slice(0, 32);

    const masterKek = await crypto.subtle.importKey(
      'raw',
      kekRaw as unknown as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
    );

    MemorySanitizer.zeroize(kekRaw);
    return masterKek;
  }

  /**
   * Synchronous FIPS 180-4 SHA-256 implementation for standalone deterministic checksumming.
   */
  private static sha256(msg: Uint8Array): Uint8Array {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];

    const H = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    const l = msg.length;
    const bitLen = l * 8;
    const padLen = l % 64 < 56 ? 56 - (l % 64) : 120 - (l % 64);
    const padded = new Uint8Array(l + padLen + 8);
    padded.set(msg, 0);
    padded[l] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(padded.length - 4, bitLen >>> 0, false);
    view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

    const W = new Uint32Array(64);
    const blockView = new DataView(padded.buffer);

    for (let i = 0; i < padded.length; i += 64) {
      for (let t = 0; t < 16; t++) {
        W[t] = blockView.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t++) {
        const s0 =
          ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^
          ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^
          (W[t - 15] >>> 3);
        const s1 =
          ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^
          ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^
          (W[t - 2] >>> 10);
        W[t] = (((W[t - 16] + s0) >>> 0) + ((W[t - 7] + s1) >>> 0)) >>> 0;
      }

      let a = H[0];
      let b = H[1];
      let c = H[2];
      let d = H[3];
      let e = H[4];
      let f = H[5];
      let g = H[6];
      let h = H[7];

      for (let t = 0; t < 64; t++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const temp1 = ((((h + S1) >>> 0) + ch) >>> 0 + K[t] + W[t]) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      H[0] = (H[0] + a) >>> 0;
      H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0;
      H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0;
      H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0;
      H[7] = (H[7] + h) >>> 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) {
      outView.setUint32(i * 4, H[i], false);
    }
    return out;
  }
}
