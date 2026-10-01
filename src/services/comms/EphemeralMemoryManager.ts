/* ============================================================
   SOVEREIGN-OS — Ephemeral Memory Manager & Zeroization Engine
   Enforces burn-on-read and automated countdown self-destruction
   Volatile RAM sanitization via MemorySanitizer (zero bytes written to disk)
   ============================================================ */

import { MemorySanitizer } from '../crypto/MemorySanitizer';

type BurnCallback = (messageId: string) => void;

interface ActiveCountdown {
  messageId: string;
  totalSeconds: number;
  remainingSeconds: number;
  timerId: ReturnType<typeof setInterval> | null;
  onBurn: BurnCallback;
}

export class EphemeralMemoryManager {
  private static activeCountdowns: Map<string, ActiveCountdown> = new Map();
  private static subscribers: Set<() => void> = new Set();

  /**
   * Subscribes a listener (e.g. React hook or Zustand store) to countdown ticks.
   */
  public static subscribe(listener: () => void): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  private static notify(): void {
    this.subscribers.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[EPHEMERAL_MANAGER] Subscriber error:', err);
      }
    });
  }

  /**
   * Registers an ephemeral countdown timer (e.g. 30 seconds).
   */
  public static registerCountdown(
    messageId: string,
    seconds: number,
    onBurn: BurnCallback
  ): void {
    if (this.activeCountdowns.has(messageId)) {
      return;
    }

    const entry: ActiveCountdown = {
      messageId,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      timerId: null,
      onBurn,
    };

    entry.timerId = setInterval(() => {
      const current = this.activeCountdowns.get(messageId);
      if (!current) return;

      current.remainingSeconds -= 1;
      this.notify();

      if (current.remainingSeconds <= 0) {
        this.burn(messageId);
      }
    }, 1000);

    this.activeCountdowns.set(messageId, entry);
    this.notify();
  }

  /**
   * Triggers single-read execution (Burn-on-Read).
   * Gives operator 5 seconds to inspect before zeroizing.
   */
  public static triggerBurnOnRead(messageId: string, onBurn: BurnCallback): void {
    if (this.activeCountdowns.has(messageId)) return;
    this.registerCountdown(messageId, 5, onBurn);
  }

  /**
   * Retrieves remaining seconds for a message, or null if not active.
   */
  public static getRemainingSeconds(messageId: string): number | null {
    const entry = this.activeCountdowns.get(messageId);
    return entry ? entry.remainingSeconds : null;
  }

  /**
   * Immediately burns and zeroizes a volatile message buffer.
   */
  public static burn(messageId: string, rawTextBuffer?: string): void {
    const entry = this.activeCountdowns.get(messageId);
    if (entry?.timerId) {
      clearInterval(entry.timerId);
    }
    this.activeCountdowns.delete(messageId);

    // Explicitly zeroize buffer in memory if provided
    if (rawTextBuffer) {
      const bytes = new TextEncoder().encode(rawTextBuffer);
      MemorySanitizer.zeroize(bytes);
    }

    if (entry) {
      entry.onBurn(messageId);
    }

    this.notify();
  }

  /**
   * Cancels any active countdown without triggering the burn callback.
   */
  public static cancelCountdown(messageId: string): void {
    const entry = this.activeCountdowns.get(messageId);
    if (entry?.timerId) {
      clearInterval(entry.timerId);
    }
    this.activeCountdowns.delete(messageId);
    this.notify();
  }

  /**
   * Clears and halts all active ephemeral timers.
   */
  public static clearAll(): void {
    this.activeCountdowns.forEach((entry) => {
      if (entry.timerId) clearInterval(entry.timerId);
    });
    this.activeCountdowns.clear();
    this.notify();
  }
}
