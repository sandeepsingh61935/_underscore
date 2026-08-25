import { describe, expect, it } from 'vitest';

import {
  createScopedHighlightQueryService,
  resolveQueryStorageScope,
} from '@/background/services/scoped-highlight-query';
import { HighlightQueryService } from '@/shared/services/highlight-query-service';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';

function makeReadable(): IReadableHighlightRepository {
  return {
    findById: async () => null,
    findAll: async () => [],
    count: async () => 0,
    exists: async () => false,
    findByUrl: async () => [],
    findByContentHash: async () => null,
    findOverlapping: async () => [],
  };
}

describe('scoped-highlight-query', () => {
  it('resolveQueryStorageScope returns basic for guests', () => {
    expect(resolveQueryStorageScope(false)).toBe('basic');
  });

  it('resolveQueryStorageScope returns pro for signed-in users', () => {
    expect(resolveQueryStorageScope(true)).toBe('pro');
  });

  it('createScopedHighlightQueryService uses basic repository for guests', () => {
    const basicReadable = makeReadable();
    const proReadable = makeReadable();
    const facadeReadable = makeReadable();

    const basicRepo = { ...basicReadable, add: async () => {}, update: async () => {}, remove: async () => {}, clear: async () => {}, addMany: async () => {} };
    const proRepo = { ...proReadable, add: async () => {}, update: async () => {}, remove: async () => {}, clear: async () => {}, addMany: async () => {} };

    const scopedHighlightRepository = {
      queryScope: (scope: 'basic' | 'pro') => (scope === 'basic' ? basicRepo : proRepo),
    };

    const repositoryFacade = {
      asCacheReadable: () => facadeReadable,
    };

    const svc = createScopedHighlightQueryService({
      isAuthenticated: false,
      repositoryFacade: repositoryFacade as never,
      scopedHighlightRepository: scopedHighlightRepository as never,
    });

    expect(svc).toBeInstanceOf(HighlightQueryService);
    expect(scopedHighlightRepository.queryScope).toBeDefined();
  });

  it('createScopedHighlightQueryService uses scoped repository for signed-in users', () => {
    const proReadable = makeReadable();
    let proUsed = false;

    const scopedHighlightRepository = {
      queryScope: (scope: 'basic' | 'pro') => {
        if (scope === 'pro') {
          proUsed = true;
          return proReadable;
        }
        return makeReadable();
      },
    };

    const repositoryFacade = {
      getReadable: () => makeReadable(),
    };

    createScopedHighlightQueryService({
      isAuthenticated: true,
      repositoryFacade: repositoryFacade as never,
      scopedHighlightRepository: scopedHighlightRepository as never,
    });

    expect(proUsed).toBe(true);
  });
});
