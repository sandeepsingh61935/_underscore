/**
 * @file i-highlight-repository.ts
 * @description Repository interface for highlight CRUD operations
 *
 * Provides abstraction over underlying storage mechanism
 * Implements Repository Pattern from quality framework
 */

import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';

/**
 * Repository interface for highlight data access
 *
 * Single source of truth for all highlight data
 * Abstracts storage implementation details
 */
export interface IHighlightRepository {
  // ============================================
  // CRUD Operations
  // ============================================

  /**
   * Add new highlight to repository
   * Idempotent - no error if already exists
   */
  add(highlight: HighlightDataV2): Promise<void>;

  /**
   * Update existing highlight
   * Throws error if highlight not found
   */
  update(id: string, updates: Partial<HighlightDataV2>): Promise<void>;

  /**
   * Remove highlight by ID
   * Idempotent - no error if not found
   */
  remove(id: string): Promise<void>;

  // ============================================
  // Queries
  // ============================================

  /**
   * Find highlight by ID
   * Returns null if not found
   */
  findById(id: string): Promise<HighlightDataV2 | null>;

  /**
   * Get all highlights
   * Returns empty array if none exist
   */
  findAll(): Promise<HighlightDataV2[]>;

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
  // Metadata
  // ============================================

  /**
   * Get total count of highlights
   */
  count(): number;

  /**
   * Check if highlight exists
   */
  exists(id: string): boolean;

  // ============================================
  // Bulk Operations
  // ============================================

  /**
   * Add multiple highlights in batch
   * More efficient than individual adds
   */
  addMany(highlights: HighlightDataV2[]): Promise<void>;

  /**
   * Remove all highlights
   * Use with caution!
   */
  clear(): Promise<void>;
}
