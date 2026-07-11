import type { HighlightData } from '@/content/modes/highlight-mode.interface';
import type { ModeManager } from '@/content/modes/mode-manager';
import { ContentHighlightDeleteClient } from '@/content/services/content-highlight-delete';
import {
  dismissDeleteUndoToast,
  showDeleteErrorToast,
  showDeleteUndoToast,
} from '@/content/ui/content-delete-toast';

export type ContentDeleteOutcome = 'deleted' | 'blocked' | 'failed' | 'cancelled';

export interface ContentHighlightDeleteFlowDeps {
  deleteClient: ContentHighlightDeleteClient;
  modeManager: ModeManager;
  getSnapshot: (id: string) => HighlightData | null;
  allowUndo: boolean;
}

let pendingUndoSnapshot: HighlightData | null = null;

export function clearPendingContentUndo(): void {
  pendingUndoSnapshot = null;
  dismissDeleteUndoToast();
}

export async function performContentHighlightDelete(
  id: string,
  deps: ContentHighlightDeleteFlowDeps,
): Promise<ContentDeleteOutcome> {
  const snapshot = deps.getSnapshot(id);
  if (!snapshot) {
    return 'failed';
  }

  dismissDeleteUndoToast();
  pendingUndoSnapshot = null;

  const result = await deps.deleteClient.deleteHighlight(id);
  if (!result.ok) {
    showDeleteErrorToast(result.error);
    return result.code === 'VAULT_LOCKED' ? 'blocked' : 'failed';
  }

  await deps.modeManager.detachHighlightFromPage(id);

  if (deps.allowUndo) {
    pendingUndoSnapshot = snapshot;
    showDeleteUndoToast('Highlight deleted', () => {
      void undoContentHighlightDelete(id, deps);
    });
  }

  return 'deleted';
}

export async function undoContentHighlightDelete(
  id: string,
  deps: Pick<ContentHighlightDeleteFlowDeps, 'deleteClient' | 'modeManager'>,
): Promise<boolean> {
  const snapshot = pendingUndoSnapshot;
  pendingUndoSnapshot = null;

  const result = await deps.deleteClient.undoDelete();
  if (!result.ok) {
    showDeleteErrorToast(result.error);
    return false;
  }

  if (snapshot && snapshot.id === id) {
    await deps.modeManager.createFromData(snapshot);
  }

  dismissDeleteUndoToast();
  showDeleteUndoToast('Highlight restored', () => {}, 2000);
  return true;
}
