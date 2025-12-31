/**
 * @file i-highlight-repository.ts
 * @description Repository interface for highlight CRUD operations
 *
 * Provides abstraction over underlying storage mechanism
 * Implements Repository Pattern from quality framework
 * Extends generic IRepository<T> with highlight-specific operations
 */

import type { IRepository } from '../interfaces/i-repository';
import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';

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
  // Inherited from IRepository<HighlightDataV2>
  // ============================================
  // add(highlight: HighlightDataV2): Promise<void>
  // findById(id: string): Promise<HighlightDataV2 | null>
  // remove(id: string): Promise<void>
  // findAll(): Promise<HighlightDataV2[]>
  // count(): number
  // exists(id: string): boolean
  // clear(): Promise<void>

  // ============================================
  // Update Operation (extends base CRUD)
  // ============================================

  /**
   * Update existing highlight
   * Throws error if highlight not found
   */
  update(id: string, updates: Partial<HighlightDataV2>): Promise<void>;

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

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Add multiple highlights in batch
   * More efficient than individual adds  */
  addMany(highlights: HighlightDataV2[]): Promise<void>;
}
