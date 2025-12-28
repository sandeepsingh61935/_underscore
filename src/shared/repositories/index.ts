/**
 * @file index.ts
 * @description Repository module barrel exports
 */

// Interfaces
export type { IHighlightRepository } from './i-highlight-repository';

// Implementations
export { InMemoryHighlightRepository } from './in-memory-highlight-repository';

// Facade (Synchronous API)
export { RepositoryFacade } from './repository-facade';

// Factory
export { RepositoryFactory } from './repository-factory';
