import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type {
  ScopedHighlightRepository,
  HighlightStorageScope,
} from '@/shared/repositories/scoped-highlight-repository';
import { HighlightQueryService } from '@/shared/services/highlight-query-service';
import type { ITagLabelResolver } from '@/shared/services/i-tag-label-resolver';

export function resolveQueryStorageScope(
  isAuthenticated: boolean
): HighlightStorageScope {
  return isAuthenticated ? 'pro' : 'basic';
}

export interface ScopedHighlightQueryDeps {
  isAuthenticated: boolean;
  repositoryFacade: RepositoryFacade;
  scopedHighlightRepository: ScopedHighlightRepository;
  tagResolver?: ITagLabelResolver;
}

/** Build a query service that reads the correct storage partition for the auth state. */
export function createScopedHighlightQueryService(
  deps: ScopedHighlightQueryDeps
): HighlightQueryService {
  const scope = resolveQueryStorageScope(deps.isAuthenticated);
  // Both scopes now read from the scoped repository partition to ensure
  // consistent read/write paths. The facade cache may have stale data from
  // a different scope (e.g., basic hydrated when pro signs in).
  const readable = deps.scopedHighlightRepository.queryScope(scope);
  return new HighlightQueryService(readable, deps.tagResolver);
}
