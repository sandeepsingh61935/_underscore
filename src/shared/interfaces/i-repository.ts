/**
 * @file i-repository.ts
 * @description Generic repository interface following Repository Pattern
 *
 * Provides base CRUD operations for any entity type
 * Follows Dependency Inversion Principle (SOLID)
 */

/**
 * Generic repository interface for data access
 *
 * @template T - The entity type managed by this repository
 *
 * @remarks
 * All concrete repositories should extend this interface
 * Provides standard CRUD operations:
 * - Create: add()
 * - Read: findById(), findAll()
 * - Update: (specific to implementation)
 * - Delete: remove(), clear()
 *
 * Methods return Promises to support async storage (IndexedDB, network, etc.)
 */
export interface IRepository<T> {
  /**
   * Add a new item to the repository
   *
   * @param item - The item to add
   * @returns Promise that resolves when the item is added
   *
   * @remarks
   * Should be idempotent - no error if item already exists
   * Implementations should handle duplicate detection
   */
  add(item: T): Promise<void>;

  /**
   * Find item by unique identifier
   *
   * @param id - Unique identifier of the item
   * @returns Promise resolving to the item if found, null otherwise
   *
   * @remarks
   * Returns null for missing items (no exceptions)
   * ID format depends on implementation
   */
  findById(id: string): Promise<T | null>;

  /**
   * Remove item by unique identifier
   *
   * @param id - Unique identifier of the item to remove
   * @returns Promise that resolves when the item is removed
   *
   * @remarks
   * Should be idempotent - no error if item doesn't exist
   */
  remove(id: string): Promise<void>;

  /**
   * Get all items in the repository
   *
   * @returns Promise resolving to array of all items, empty array if none exist
   *
   * @remarks
   * Returns snapshot of current state
   * Order is implementation-specific
   */
  findAll(): Promise<T[]>;

  /**
   * Get total count of items
   *
   * @returns Number of items in repository
   *
   * @remarks
   * Synchronous for performance
   * May require initialization before accurate count
   */
  count(): number;

  /**
   * Check if item exists
   *
   * @param id - Unique identifier of the item
   * @returns true if item exists, false otherwise
   */
  exists(id: string): boolean;

  /**
   * Remove all items from repository
   *
   * @returns Promise that resolves when all items are removed
   *
   * @remarks
   * Use with caution! This is a destructive operation
   * Cannot be undone without backup
   */
  clear(): Promise<void>;
}
