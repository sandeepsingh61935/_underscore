import type { ScopedHighlightRepository, HighlightStorageScope } from '@/shared/repositories/scoped-highlight-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { HighlightQueryService } from '@/shared/services/highlight-query-service';
import type { ITagLabelResolver } from '@/shared/services/i-tag-label-resolver';

export function resolveQueryStorageScope(isAuthenticated: boolean): HighlightStorageScope {
  return isAuthenticated ? 'pro' : 'basic';
}

export interface ScopedHighlightQueryDeps {
  isAuthenticated: boolean;
  repositoryFacade: RepositoryFacade;
  scopedHighlightRepository: ScopedHighlightRepository;
  tagResolver?: ITagLabelResolver;
}

/** Build a query service that reads the correct storage partition for the auth state. */
export function createScopedHighlightQueryService(deps: ScopedHighlightQueryDeps): HighlightQueryService {
  const scope = resolveQueryStorageScope(deps.isAuthenticated);
  // Pro: durable DualWrite/local pro IDB (survives SW restart; matches restore path).
  // Cache-only reads missed rows when facade was still hydrated from basic scope.
  // Basic (guest): dedicated basic partition.
  const readable = scope === 'pro'
    ? deps.repositoryFacade.getReadable()
    : deps.scopedHighlightRepository.queryScope('basic');
  return new HighlightQueryService(readable, deps.tagResolver);
}
