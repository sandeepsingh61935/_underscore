/**
 * @file optimisticMetadataSave.ts
 * @description Instant local library patches for notes/tags; network save in background
 * with rollback on failure. Keeps Home/Library card edits feeling synchronous.
 */

import type { HighlightMetadataInput } from '@/shared/utils/highlight-metadata';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

export type WebHighlightPatch = {
  note?: string;
  tags?: string[];
};

export type UpdateHighlightMetadataFn = (
  id: string,
  input: HighlightMetadataInput,
  options?: { silent?: boolean }
) => Promise<boolean>;

export type OptimisticMetadataDeps = {
  /** Latest highlight snapshot (ref-backed so handlers stay stable). */
  getHighlight: (id: string) => WebHighlight | undefined;
  patchHighlight: (id: string, patch: WebHighlightPatch) => void;
  updateMetadata: UpdateHighlightMetadataFn;
};

/**
 * Build note/tag save handlers that patch the local aggregate first, then persist.
 * On network failure, restore the previous note/tags and return false.
 */
export function createOptimisticMetadataHandlers(deps: OptimisticMetadataDeps): {
  handleNoteSave: (id: string, note: string) => Promise<boolean>;
  handleTagsChange: (id: string, tags: string[]) => Promise<boolean>;
} {
  const handleNoteSave = async (id: string, note: string): Promise<boolean> => {
    const prev = deps.getHighlight(id);
    deps.patchHighlight(id, { note });
    const ok = await deps.updateMetadata(id, { notes: note }, { silent: true });
    if (!ok) {
      if (prev) deps.patchHighlight(id, { note: prev.note });
      return false;
    }
    return true;
  };

  const handleTagsChange = async (id: string, tags: string[]): Promise<boolean> => {
    const prev = deps.getHighlight(id);
    deps.patchHighlight(id, { tags });
    const ok = await deps.updateMetadata(id, { tags }, { silent: true });
    if (!ok) {
      if (prev) deps.patchHighlight(id, { tags: [...prev.tags] });
      return false;
    }
    return true;
  };

  return { handleNoteSave, handleTagsChange };
}
