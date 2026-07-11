import { useCallback } from 'react';
import { toast } from 'sonner';

import type {
  DeleteRequest,
  DeleteResult,
} from '@/background/services/highlight-delete-service';
import {
  IPC_HIGHLIGHT_DELETE_SCOPE,
  IPC_HIGHLIGHT_UNDO_DELETE,
} from '@/shared/schemas/message-schemas';
import { useIpcAction } from '@/shared/hooks/useIpcAction';

export function useHighlightDelete() {
  const deleteScopeAction = useIpcAction<DeleteRequest, DeleteResult>(IPC_HIGHLIGHT_DELETE_SCOPE);
  const undoAction = useIpcAction<Record<string, never>, DeleteResult>(IPC_HIGHLIGHT_UNDO_DELETE);

  const undoLastDelete = useCallback(async (): Promise<boolean> => {
    const result = await undoAction({});
    if (!result.success) {
      toast.error(result.error ?? 'Undo failed');
      return false;
    }
    const data = result.data;
    if (!data.success) {
      toast.error(data.error ?? 'Undo failed');
      return false;
    }
    toast.success('Highlight restored');
    return true;
  }, [undoAction]);

  const deleteScope = useCallback(
    async (request: DeleteRequest): Promise<DeleteResult | null> => {
      const result = await deleteScopeAction(request);
      if (!result.success) {
        toast.error(result.error ?? 'Delete failed');
        return null;
      }

      const data = result.data;
      if (!data.success) {
        toast.error(data.error);
        return data;
      }

      if (request.scope === 'highlight') {
        toast.success('Highlight deleted', {
          duration: 5000,
          action: {
            label: 'Undo',
            onClick: () => {
              void undoLastDelete();
            },
          },
        });
      } else if (request.scope === 'library') {
        toast.success('Library deleted');
      } else {
        toast.success(`Deleted ${data.deletedCount} highlight${data.deletedCount === 1 ? '' : 's'}`);
      }

      return data;
    },
    [deleteScopeAction, undoLastDelete],
  );

  return { deleteScope, undoLastDelete };
}
