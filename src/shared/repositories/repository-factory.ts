/**
 * @file repository-factory.ts
 * @description Factory for creating repository instances
 *
 * Implements Factory Pattern for swappable repository implementations
 */

import type { IHighlightRepository } from './i-highlight-repository';
import { InMemoryHighlightRepository } from './in-memory-highlight-repository';

/**
 * Repository factory
 *
 * Provides centralized access to repository instances
 * Allows swapping implementations (in-memory, IndexedDB, etc.)
 */
export class RepositoryFactory {
  private static instance: IHighlightRepository | null = null;

  /**
   * Get singleton repository instance
   *
   * Returns the same instance across all calls
   * Creates new instance on first call
   */
  static getHighlightRepository(): IHighlightRepository {
    if (!this.instance) {
      this.instance = new InMemoryHighlightRepository();
    }
    return this.instance;
  }

  /**
   * Reset factory (for testing)
   *
   * Clears singleton instance
   * Next getHighlightRepository() call will create new instance
   */
  static reset(): void {
    this.instance = null;
  }

  private static currentMode: 'walk' | 'sprint' = 'walk';

  /**
   * Set the current operation mode
   *
   * @param mode 'walk' (no persistence) or 'sprint' (persistence)
   */
  static setMode(mode: 'walk' | 'sprint'): void {
    this.currentMode = mode;
    // In the future, this might trigger a repository swap
    // For now, both use InMemory, but logic in Facade might differ based on mode
  }

  /**
   * Get the current mode
   */
  static getMode(): 'walk' | 'sprint' {
    return this.currentMode;
  }

  /**
   * Set custom repository implementation
   *
   * Allows dependency injection for testing
   * or switching to different storage backend
   */
  static setRepository(repository: IHighlightRepository): void {
    this.instance = repository;
  }
}
