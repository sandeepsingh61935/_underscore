/**
 * @file repository-facade-reload.test.ts
 * @description Locks the RepositoryFacade.reload() contract: invalidates the
 * in-memory cache and re-fetches from the underlying repository.
 *
 * Regression: src/entrypoints/content.ts calls `await repositoryFacade.reload()`
 * inside the AUTH_STATE_CHANGED handler to refresh data after login/logout.
 * The method did not exist on the facade; tsc flagged "Property 'reload' does
 * not exist on type 'RepositoryFacade'".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

const makeHighlight = (id: string, text: string): HighlightDataV2 => ({
  id,
  text,
  contentHash: 'a'.repeat(64),
  colorRole: 'yellow',
  type: 'underscore',
  ranges: [
    {
      xpath: '/p',
      startOffset: 0,
      endOffset: text.length,
      text,
      textBefore: '',
      textAfter: '',
    },
  ],
  createdAt: new Date(),
});

describe('RepositoryFacade.reload()', () => {
  let mockRepo: IHighlightRepository;
  let facade: RepositoryFacade;

  beforeEach(async () => {
    mockRepo = {
      findAll: vi.fn().mockResolvedValue([makeHighlight('h1', 'one')]),
      findById: vi.fn(),
      findByUrl: vi.fn(),
      findByContentHash: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as IHighlightRepository;
    facade = new RepositoryFacade(mockRepo);
    await facade.initialize();
  });

  it('exists and re-fetches all data from the underlying repository', async () => {
    expect(typeof facade.reload).toBe('function');

    // Simulate the underlying repo returning a new shape after auth change.
    (mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeHighlight('h1', 'one'),
      makeHighlight('h2', 'two'),
    ]);

    await facade.reload();
    expect(facade.getAll()).toHaveLength(2);
  });

  it('reflects deletions from the underlying repository', async () => {
    // After init, repo has 1 item. Simulate the user deleting one elsewhere,
    // then call reload() — the cache should reflect the deletion.
    (mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      makeHighlight('h1', 'one'),
    ]);
    await facade.reload();
    expect(facade.getAll()).toHaveLength(1);

    // Now repo returns nothing — reload should empty the cache.
    (mockRepo.findAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    await facade.reload();
    expect(facade.getAll()).toHaveLength(0);
  });
});
