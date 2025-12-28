/**
 * @file index.ts
 * @description Repository module barrel exports
 */

// Interfaces
export type { IHighlightRepository } from './i-highlight-repository';

// Implementations
export { InMemoryHighlightRepository } from './in-memory-highlight-repository';

// Factory
export { RepositoryFactory } from './repository-factory';
