/**
 * Regression: Library queries must read the facade cache in the background.
 * Deletes update the cache immediately; IndexedDB persistence is async.
 */

import { describe, expect, it } from 'vitest';

import {
  HighlightDeleteService,
  type HighlightCloudDeletePort,
  type HighlightDeleteContext,
} from '@/background/services/highlight-delete-service';
import { HighlightQueryService } from '@/shared/services/highlight-query-service';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { LOCAL_FILES_DOMAIN } from '@/shared/utils/domain-from-url';

class DelayedRemoveRepository extends InMemoryHighlightRepository {
  override async remove(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 30));
    await super.remove(id);
  }
}

function makeHighlight(id: string, url: string): HighlightDataV2 {
  return {
    id,
    text: `text-${id}`,
    contentHash: id.replace(/-/g, '').padEnd(64, 'a'),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/p',
        startOffset: 0,
        endOffset: 4,
        text: 'text',
        textBefore: '',
        textAfter: '',
      },
    ],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-02'),
    url,
  };
}

const guestContext: HighlightDeleteContext = { isAuthenticated: false, vaultUnlocked: true };

const cloudPort: HighlightCloudDeletePort = {
  deleteHighlight: async () => undefined,
  restoreHighlight: async () => undefined,
  softDeleteAllHighlights: async () => undefined,
};

describe('Basic mode library delete + query consistency', () => {
  it('asCacheReadable sees cache evictions before storage remove finishes', async () => {
    const basic = new DelayedRemoveRepository();
    const scoped = new ScopedHighlightRepository(basic, new InMemoryHighlightRepository(), 'basic');
    const facade = new RepositoryFacade(scoped);
    await facade.initialize();

    const fileUrl = 'file:///tmp/architecture-review.html';
    facade.add(makeHighlight('hl-1', fileUrl));
    facade.add(makeHighlight('hl-2', fileUrl));

    const storageQuery = new HighlightQueryService(facade.getReadable());
    const cacheQuery = new HighlightQueryService(facade.asCacheReadable());

    facade.remove('hl-1');
    facade.remove('hl-2');

    expect(await cacheQuery.getHighlightsByDomain(LOCAL_FILES_DOMAIN)).toHaveLength(0);
    expect(await storageQuery.getHighlightsByDomain(LOCAL_FILES_DOMAIN)).toHaveLength(2);

    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(await storageQuery.getHighlightsByDomain(LOCAL_FILES_DOMAIN)).toHaveLength(0);
  });

  it('delete service persists Local files domain wipe for basic guests', async () => {
    const basic = new DelayedRemoveRepository();
    const scoped = new ScopedHighlightRepository(basic, new InMemoryHighlightRepository(), 'basic');
    const facade = new RepositoryFacade(scoped);
    await facade.initialize();

    const fileUrl = 'file:///tmp/architecture-review.html';
    facade.add(makeHighlight('hl-1', fileUrl));
    facade.add(makeHighlight('hl-2', fileUrl));

    const cacheQuery = new HighlightQueryService(facade.asCacheReadable());
    const deleteService = new HighlightDeleteService(facade, cloudPort);

    const deleteResult = await deleteService.executeDelete(
      { scope: 'domain', domain: LOCAL_FILES_DOMAIN },
      guestContext,
    );

    expect(deleteResult).toEqual({
      success: true,
      deletedCount: 2,
      removedIds: ['hl-1', 'hl-2'],
    });

    expect(await cacheQuery.getHighlightsByDomain(LOCAL_FILES_DOMAIN)).toHaveLength(0);
    expect(await cacheQuery.getCollections('basic')).toEqual([]);
    expect(await basic.count()).toBe(0);
  });
});
