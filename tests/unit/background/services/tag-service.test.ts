import { describe, expect, it, vi } from 'vitest';

import { TagService } from '@/background/services/tag-service';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import { LoggerFactory } from '@/shared/utils/logger';

function createRepo(overrides: Partial<ITagRepository> = {}): ITagRepository {
  return {
    listAll: vi.fn().mockResolvedValue([]),
    getLabelsForHighlight: vi.fn().mockResolvedValue([]),
    getLabelsForHighlights: vi.fn().mockResolvedValue(new Map()),
    setHighlightLabels: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('TagService', () => {
  it('writes labels locally and to cloud when authenticated', async () => {
    const local = createRepo();
    const cloud = createRepo();
    const service = new TagService(local, cloud, () => true, LoggerFactory.getLogger('test'));

    await service.setHighlightLabels('hl-1', ['Alpha', 'alpha']);

    expect(local.setHighlightLabels).toHaveBeenCalledWith('hl-1', ['alpha']);
    expect(cloud.setHighlightLabels).toHaveBeenCalledWith('hl-1', ['alpha']);
  });

  it('merges junction labels with legacy metadata tags', () => {
    const service = new TagService(createRepo(), null, () => false, LoggerFactory.getLogger('test'));
    expect(service.mergeWithMetadataFallback(['todo'], ['Read'])).toEqual(['todo', 'read']);
  });
});
