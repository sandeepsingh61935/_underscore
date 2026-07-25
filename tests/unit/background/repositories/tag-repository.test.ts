import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach } from 'vitest';

import { IndexedDBTagRepository } from '@/background/repositories/indexed-db-tag-repository';
import { LoggerFactory } from '@/shared/utils/logger';

const TEST_DB = 'underscore_tag_repo_test';

describe('IndexedDBTagRepository', () => {
  let repo: IndexedDBTagRepository;
  let dbCounter = 0;

  beforeEach(() => {
    dbCounter += 1;
    repo = new IndexedDBTagRepository(LoggerFactory.getLogger('test'), `${TEST_DB}_${dbCounter}`);
  });

  it('replaces highlight labels atomically', async () => {
    await repo.setHighlightLabels('hl-1', ['alpha', 'beta']);
    expect((await repo.getLabelsForHighlight('hl-1')).sort()).toEqual(['alpha', 'beta']);

    await repo.setHighlightLabels('hl-1', ['gamma']);
    expect(await repo.getLabelsForHighlight('hl-1')).toEqual(['gamma']);
  });

  it('lists distinct user tags', async () => {
    await repo.setHighlightLabels('hl-1', ['alpha']);
    await repo.setHighlightLabels('hl-2', ['beta']);

    const tags = await repo.listAll();
    expect(tags.map((tag) => tag.name).sort()).toEqual(['alpha', 'beta']);
  });
});
