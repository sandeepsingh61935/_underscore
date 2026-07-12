import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { HighlightData } from '@/content/modes/highlight-mode.interface';
import type { ModeManager } from '@/content/modes/mode-manager';
import { ContentHighlightDeleteClient } from '@/content/services/content-highlight-delete';
import {
  clearPendingContentUndo,
  performContentHighlightDelete,
  undoContentHighlightDelete,
} from '@/content/services/content-highlight-delete-flow';

vi.mock('@/content/ui/content-delete-toast', () => ({
  dismissDeleteUndoToast: vi.fn(),
  showDeleteErrorToast: vi.fn(),
  showDeleteUndoToast: vi.fn((_msg: string, onUndo: () => void) => {
    (globalThis as { __lastUndo?: () => void }).__lastUndo = onUndo;
  }),
}));

const HIGHLIGHT_ID = '11111111-1111-4111-8111-111111111111';

function makeSnapshot(): HighlightData {
  return {
    id: HIGHLIGHT_ID,
    text: 'quote',
    contentHash: 'a'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/p',
        startOffset: 0,
        endOffset: 4,
        text: 'quot',
        textBefore: '',
        textAfter: '',
      },
    ],
  };
}

function makeDeps(overrides: Partial<{
  deleteResult: Awaited<ReturnType<ContentHighlightDeleteClient['deleteHighlight']>>;
  undoResult: Awaited<ReturnType<ContentHighlightDeleteClient['undoDelete']>>;
}> = {}) {
  const modeManager = {
    detachHighlightFromPage: vi.fn().mockResolvedValue(undefined),
    createFromData: vi.fn().mockResolvedValue(undefined),
    getHighlight: vi.fn(),
  } as unknown as ModeManager;

  const deleteClient = {
    deleteHighlight: vi.fn().mockResolvedValue(
      overrides.deleteResult ?? { ok: true, data: { success: true, deletedCount: 1 } },
    ),
    undoDelete: vi.fn().mockResolvedValue(
      overrides.undoResult ?? { ok: true, data: { success: true, deletedCount: 0 } },
    ),
  } as unknown as ContentHighlightDeleteClient;

  return {
    modeManager,
    deleteClient,
    deps: {
      deleteClient,
      modeManager,
      getSnapshot: () => makeSnapshot(),
      allowUndo: true,
    },
  };
}

describe('performContentHighlightDelete', () => {
  beforeEach(() => {
    clearPendingContentUndo();
    delete (globalThis as { __lastUndo?: () => void }).__lastUndo;
  });

  it('deletes through background IPC and detaches the highlight from the page', async () => {
    const { modeManager, deleteClient, deps } = makeDeps();

    const outcome = await performContentHighlightDelete(HIGHLIGHT_ID, deps);

    expect(outcome).toBe('deleted');
    expect(deleteClient.deleteHighlight).toHaveBeenCalledWith(HIGHLIGHT_ID);
    expect(modeManager.detachHighlightFromPage).toHaveBeenCalledWith(HIGHLIGHT_ID);
  });

});

describe('undoContentHighlightDelete', () => {
  beforeEach(() => {
    clearPendingContentUndo();
  });

  it('restores the snapshot after a successful undo IPC call', async () => {
    const { modeManager, deleteClient, deps } = makeDeps();
    await performContentHighlightDelete(HIGHLIGHT_ID, deps);

    const ok = await undoContentHighlightDelete(HIGHLIGHT_ID, deps);

    expect(ok).toBe(true);
    expect(deleteClient.undoDelete).toHaveBeenCalled();
    expect(modeManager.createFromData).toHaveBeenCalledWith(expect.objectContaining({ id: HIGHLIGHT_ID }));
  });
});
