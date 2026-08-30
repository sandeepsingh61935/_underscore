import { describe, it, expect, vi } from 'vitest';

import { createOptimisticMetadataHandlers } from './optimisticMetadataSave';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

function hl(partial: Partial<WebHighlight> & Pick<WebHighlight, 'id'>): WebHighlight {
  return {
    domain: 'example.com',
    path: '/',
    quote: 'q',
    note: '',
    tags: [],
    savedAt: 1,
    ...partial,
  };
}

describe('createOptimisticMetadataHandlers', () => {
  it('patches note immediately and keeps it when network succeeds', async () => {
    const row = hl({ id: '1', note: 'old' });
    const store = new Map<string, WebHighlight>([['1', row]]);
    const patchHighlight = vi.fn((id: string, patch: { note?: string; tags?: string[] }) => {
      const cur = store.get(id)!;
      store.set(id, {
        ...cur,
        note: patch.note !== undefined ? patch.note : cur.note,
        tags: patch.tags !== undefined ? patch.tags : cur.tags,
      });
    });
    const updateMetadata = vi.fn().mockResolvedValue(true);

    const { handleNoteSave } = createOptimisticMetadataHandlers({
      getHighlight: (id) => store.get(id),
      patchHighlight,
      updateMetadata,
    });

    const p = handleNoteSave('1', 'new note');
    // Optimistic: patched before await settles.
    expect(store.get('1')?.note).toBe('new note');
    expect(await p).toBe(true);
    expect(updateMetadata).toHaveBeenCalledWith('1', { notes: 'new note' }, { silent: true });
    expect(store.get('1')?.note).toBe('new note');
  });

  it('rolls note back when network fails', async () => {
    const row = hl({ id: '1', note: 'old' });
    const store = new Map<string, WebHighlight>([['1', row]]);
    const patchHighlight = vi.fn((id: string, patch: { note?: string; tags?: string[] }) => {
      const cur = store.get(id)!;
      store.set(id, {
        ...cur,
        note: patch.note !== undefined ? patch.note : cur.note,
        tags: patch.tags !== undefined ? patch.tags : cur.tags,
      });
    });
    const updateMetadata = vi.fn().mockResolvedValue(false);

    const { handleNoteSave } = createOptimisticMetadataHandlers({
      getHighlight: (id) => store.get(id),
      patchHighlight,
      updateMetadata,
    });

    expect(await handleNoteSave('1', 'new note')).toBe(false);
    expect(store.get('1')?.note).toBe('old');
  });

  it('patches tags immediately and rolls back on failure', async () => {
    const row = hl({ id: '1', tags: ['a'] });
    const store = new Map<string, WebHighlight>([['1', row]]);
    const patchHighlight = vi.fn((id: string, patch: { note?: string; tags?: string[] }) => {
      const cur = store.get(id)!;
      store.set(id, {
        ...cur,
        note: patch.note !== undefined ? patch.note : cur.note,
        tags: patch.tags !== undefined ? patch.tags : cur.tags,
      });
    });
    const updateMetadata = vi.fn().mockResolvedValue(false);

    const { handleTagsChange } = createOptimisticMetadataHandlers({
      getHighlight: (id) => store.get(id),
      patchHighlight,
      updateMetadata,
    });

    const p = handleTagsChange('1', ['a', 'b']);
    expect(store.get('1')?.tags).toEqual(['a', 'b']);
    expect(await p).toBe(false);
    expect(store.get('1')?.tags).toEqual(['a']);
  });
});
