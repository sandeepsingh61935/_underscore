/**
 * @file useWebHighlightDelete.ts
 * @description Web library scoped delete (highlight / section / domain) with toasts.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';

import {
  softDeleteHighlightsWeb,
  type WebDeleteResult,
} from '@/shared/services/highlight-delete-web';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

export type WebDeleteRequest =
  | { scope: 'highlight'; id: string }
  | { scope: 'section'; domain: string; sectionKey: string }
  | { scope: 'domain'; domain: string }
  | { scope: 'library' };

function idsForRequest(
  highlights: readonly WebHighlight[],
  request: WebDeleteRequest,
): string[] {
  switch (request.scope) {
    case 'highlight':
      return highlights.some((h) => h.id === request.id) ? [request.id] : [];
    case 'section':
      return highlights
        .filter((h) => h.domain === request.domain && h.path === request.sectionKey)
        .map((h) => h.id);
    case 'domain':
      return highlights.filter((h) => h.domain === request.domain).map((h) => h.id);
    case 'library':
      return highlights.map((h) => h.id);
    default: {
      const _x: never = request;
      return _x;
    }
  }
}

export type UseWebHighlightDeleteOpts = {
  highlights: readonly WebHighlight[];
  /** Remove ids from local library aggregate after successful cloud delete. */
  removeHighlights: (ids: readonly string[]) => void;
};

/**
 * Soft-delete helpers for LibraryPage. Guests should not call these.
 */
export function useWebHighlightDelete(opts: UseWebHighlightDeleteOpts) {
  const { highlights, removeHighlights } = opts;

  const deleteScope = useCallback(
    async (request: WebDeleteRequest): Promise<WebDeleteResult> => {
      const ids = idsForRequest(highlights, request);
      if (ids.length === 0) {
        const empty: WebDeleteResult = {
          success: false,
          error:
            request.scope === 'highlight'
              ? 'Highlight not found'
              : 'Nothing to delete',
        };
        toast.error(empty.error);
        return empty;
      }

      const result = await softDeleteHighlightsWeb(ids);
      if (!result.success) {
        toast.error(result.error);
        return result;
      }

      removeHighlights(result.removedIds);

      if (request.scope === 'highlight') {
        toast.success('Highlight deleted');
      } else if (request.scope === 'library') {
        toast.success(
          result.deletedCount === 1
            ? 'Library deleted (1 highlight)'
            : `Library deleted (${result.deletedCount} highlights)`,
        );
      } else {
        toast.success(
          `Deleted ${result.deletedCount} highlight${result.deletedCount === 1 ? '' : 's'}`,
        );
      }
      return result;
    },
    [highlights, removeHighlights],
  );

  return { deleteScope };
}
