/**
 * @file local-write-echo-tracker.ts
 * @description Suppresses realtime echoes of writes originating on this device.
 */

type WriteOperation = 'add' | 'update' | 'remove';

interface EchoEntry {
  operation: WriteOperation;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 15_000;

export class LocalWriteEchoTracker {
  private readonly entries = new Map<string, EchoEntry>();

  record(id: string, operation: WriteOperation, ttlMs: number = DEFAULT_TTL_MS): void {
    this.prune();
    this.entries.set(id, {
      operation,
      expiresAt: Date.now() + ttlMs,
    });
  }

  isEcho(id: string | undefined | null): boolean {
    if (!id) {
      return false;
    }

    this.prune();
    return this.entries.has(id);
  }

  clear(): void {
    this.entries.clear();
  }

  private prune(): void {
    const now = Date.now();
    for (const [id, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(id);
      }
    }
  }
}
