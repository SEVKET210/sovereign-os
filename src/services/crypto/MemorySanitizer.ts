/* ============================================================
   SOVEREIGN-OS — Cryptographic Memory Sanitizer & Zeroization Utility
   Guarantees immediate zero-fill wipe of volatile RAM buffers
   to prevent cold-boot, memory-dump, or heap-inspection leakage
   ============================================================ */

export class MemorySanitizer {
  /**
   * Overwrites target buffer with 0x00 bytes immediately.
   */
  public static zeroize(target: Uint8Array | ArrayBuffer | number[] | null | undefined): void {
    if (!target) return;

    if (target instanceof Uint8Array) {
      target.fill(0);
    } else if (target instanceof ArrayBuffer) {
      new Uint8Array(target).fill(0);
    } else if (Array.isArray(target)) {
      for (let i = 0; i < target.length; i++) {
        target[i] = 0;
      }
    }
  }

  /**
   * Allocates a temporary Uint8Array of the given size, executes the callback,
   * and guarantees zeroization in a finally block.
   */
  public static async withCleanBuffer<T>(
    size: number,
    fn: (buf: Uint8Array) => Promise<T> | T
  ): Promise<T> {
    const buffer = new Uint8Array(size);
    try {
      return await fn(buffer);
    } finally {
      this.zeroize(buffer);
    }
  }

  /**
   * Converts a hexadecimal string to Uint8Array.
   */
  public static hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
    const length = Math.floor(cleanHex.length / 2);
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  /**
   * Converts Uint8Array to a continuous hexadecimal string.
   */
  public static bytesToHex(bytes: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
}
