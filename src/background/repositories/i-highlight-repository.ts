/**
 * @file i-highlight-repository.ts
 * @description Repository interface for highlight CRUD operations
 *
 * Provides abstraction over underlying storage mechanism
 * Implements Repository Pattern from quality framework
 * Extends generic IRepository<T> with highlight-specific operations
 */

import type { IRepository } from '@/shared/interfaces/i-repository';
import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';

/**
 * Options for repository operations
 */
export interface RepositoryOptions {
  /**
   * If true, prevents the operation from triggering a sync to the cloud.
   * critical for preventing infinite loops when applying remote changes.
   */
  skipSync?: boolean;
}

/**
 * Repository interface for highlight data access
 *
 * Single source of truth for all highlight data
 * Abstracts storage implementation details
 *
 * @extends IRepository<HighlightDataV2>
 * Inherits base CRUD operations (add, get, remove, getAll, count, clear)
 * Adds highlight-specific query methods
 */
export interface IHighlightRepository extends IRepository<HighlightDataV2> {
  // ============================================
  // Overrides with Options (for Loop Prevention)
  // ============================================

  add(highlight: HighlightDataV2, options?: RepositoryOptions): Promise<void>;

  remove(id: string, options?: RepositoryOptions): Promise<void>;

  // ============================================
  // Valid Method Signatures
  // ============================================
  // findById(id: string): Promise<HighlightDataV2 | null>
  // findAll(): Promise<HighlightDataV2[]>
  // count(): Promise<number>
  // exists(id: string): Promise<boolean>
  // clear(): Promise<void>

  // ============================================
  // Update Operation (extends base CRUD)
  // ============================================

  /**
   * Update existing highlight
   * Throws error if highlight not found
   */
  update(id: string, updates: Partial<HighlightDataV2>, options?: RepositoryOptions): Promise<void>;

  // ============================================
  // Highlight-Specific Queries
  // ============================================

  /**
   * Find highlight by content hash
   * Used for deduplication
   */
  findByContentHash(hash: string): Promise<HighlightDataV2 | null>;

  /**
   * Find highlights that overlap with given range
   * Returns empty array if no overlaps
   */
  findOverlapping(range: SerializedRange): Promise<HighlightDataV2[]>;

  /**
   * Find highlights by Page URL
   */
  findByUrl(url: string): Promise<HighlightDataV2[]>;

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Add multiple highlights in batch
   * More efficient than individual adds  */
  addMany(highlights: HighlightDataV2[]): Promise<void>;
}
