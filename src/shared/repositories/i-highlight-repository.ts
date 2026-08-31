/**
 * @file i-highlight-repository.ts
 * @description Repository interfaces for highlight CRUD operations
 *
 * Per ADR-005, the IHighlightRepository interface is split into:
 *   - IReadableHighlightRepository: read-side operations
 *   - IWritableHighlightRepository: write-side operations
 *   - IHighlightRepository: union of both
 *
 * Local/Supabase/InMemory adapters implement the union. The content-side
 * IPC adapter implements IWritableHighlightRepository only — reads go
 * through RepositoryFacade on the content side (synchronous, in-memory).
 *
 * Implements Repository Pattern from quality framework.
 */

import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';

/**
 * Options for repository operations
 */
export interface RepositoryOptions {
  /**
   * If true, prevents the operation from triggering a sync to the cloud.
   * Critical for preventing infinite loops when applying remote changes.
   */
  skipSync?: boolean;
}

/**
 * Read-side repository contract. Storage backends (IndexedDB, Supabase,
 * InMemory) implement this; the content-side IPC adapter does not.
 */
export interface IReadableHighlightRepository {
  findById(id: string): Promise<HighlightDataV2 | null>;
  findAll(): Promise<HighlightDataV2[]>;
  count(): Promise<number>;
  exists(id: string): Promise<boolean>;
  findByUrl(url: string): Promise<HighlightDataV2[]>;
  findByContentHash(hash: string): Promise<HighlightDataV2 | null>;
  findOverlapping(range: SerializedRange): Promise<HighlightDataV2[]>;
}

/**
 * Write-side repository contract. Implemented by every adapter,
 * including the content-side IPC adapter.
 *
 * `clear` lives here because it is destructive: it removes all rows in
 * the storage layer. The content-side IPC adapter does NOT implement
 * clear (no IPC_HIGHLIGHT_CLEAR message exists). When a mode calls clear,
 * it must route through the facade, not the IPC adapter.
 */
export interface IWritableHighlightRepository {
  add(highlight: HighlightDataV2, options?: RepositoryOptions): Promise<void>;
  update(
    id: string,
    updates: Partial<HighlightDataV2>,
    options?: RepositoryOptions
  ): Promise<void>;
  remove(id: string, options?: RepositoryOptions): Promise<void>;
  clear(): Promise<void>;
  addMany(highlights: HighlightDataV2[]): Promise<void>;
}

/**
 * Combined repository contract. Storage backends implement both halves.
 *
 * The facade and orchestrator use this union because they need to perform
 * both reads and writes. Modes that hold a content-side reference should
 * prefer the narrower IWritableHighlightRepository or the in-memory
 * RepositoryFacade for reads.
 */
export interface IHighlightRepository
  extends IReadableHighlightRepository, IWritableHighlightRepository {
  // Convenience accessor for the generic IRepository<T> shape (used by
  // some legacy helpers that don't care which half of the contract they
  // call).
  add(highlight: HighlightDataV2, options?: RepositoryOptions): Promise<void>;
}
