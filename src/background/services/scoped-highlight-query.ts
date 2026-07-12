import type { ScopedHighlightRepository, HighlightStorageScope } from '@/shared/repositories/scoped-highlight-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { HighlightQueryService } from '@/shared/services/highlight-query-service';

export function resolveQueryStorageScope(isAuthenticated: boolean): HighlightStorageScope {
  return isAuthenticated ? 'pro' : 'basic';
}

export interface ScopedHighlightQueryDeps {
  isAuthenticated: boolean;
  repositoryFacade: RepositoryFacade;
  scopedHighlightRepository: ScopedHighlightRepository;
}

/** Build a query service that reads the correct storage partition for the auth state. */
export function createScopedHighlightQueryService(deps: ScopedHighlightQueryDeps): HighlightQueryService {
  const scope = resolveQueryStorageScope(deps.isAuthenticated);
  const readable = scope === 'pro'
    ? deps.repositoryFacade.asCacheReadable()
    : deps.scopedHighlightRepository.queryScope('basic');
  return new HighlightQueryService(readable);
}
