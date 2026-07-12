import { describe, expect, it, vi } from 'vitest';

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { handleLibraryDataChanged } from '@/content/services/content-library-sync';
import type { ModeManager } from '@/content/modes/mode-manager';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';

const HIGHLIGHT_ID = '11111111-1111-4111-8111-111111111111';
const PAGE_URL = 'https://example.com/article';

function makeHighlight(): HighlightDataV2 {
  return {
    id: HIGHLIGHT_ID,
    text: 'restored text',
    contentHash: 'a'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/p[1]',
        startOffset: 0,
        endOffset: 4,
        text: 'rest',
        textBefore: '',
        textAfter: '',
      },
    ],
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-02'),
    url: PAGE_URL,
  };
}

function makeDeps(overrides: Partial<{
  has: boolean;
  getHighlight: ReturnType<typeof vi.fn>;
  messageBus: IMessageBus;
}> = {}) {
  const modeManager = {
    detachHighlightFromPage: vi.fn().mockResolvedValue(undefined),
    getHighlight: overrides.getHighlight ?? vi.fn().mockReturnValue(null),
    createFromData: vi.fn().mockResolvedValue(undefined),
  } as unknown as ModeManager;

  const repositoryFacade = {
    has: vi.fn().mockReturnValue(overrides.has ?? true),
    rehydrate: vi.fn(),
  } as unknown as RepositoryFacade;

  const messageBus = overrides.messageBus ?? {
    send: vi.fn().mockResolvedValue({ success: true, data: makeHighlight() }),
    subscribe: vi.fn(),
    publish: vi.fn(),
  };

  return {
    modeManager,
    repositoryFacade,
    messageBus,
    deps: {
      modeManager,
      repositoryFacade,
      messageBus,
      currentUrl: PAGE_URL,
      deserializeRange: vi.fn().mockReturnValue(document.createRange()),
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    },
  };
}

describe('handleLibraryDataChanged', () => {
  it('detaches removed highlights that are still in the page cache', async () => {
    const { modeManager, deps } = makeDeps();

    await handleLibraryDataChanged(
      { source: 'delete', removedIds: [HIGHLIGHT_ID] },
      deps,
    );

    expect(modeManager.detachHighlightFromPage).toHaveBeenCalledWith(HIGHLIGHT_ID);
  });

  it('rehydrates cache and re-renders when a highlight is restored on the active page', async () => {
    const { modeManager, repositoryFacade, deps } = makeDeps();

    await handleLibraryDataChanged(
      { source: 'undo_delete', restoredIds: [HIGHLIGHT_ID] },
      deps,
    );

    expect(repositoryFacade.rehydrate).not.toHaveBeenCalled();
    expect(modeManager.createFromData).toHaveBeenCalledWith(
      expect.objectContaining({ id: HIGHLIGHT_ID, liveRanges: [expect.any(Range)] }),
    );
  });

  it('rehydrates cache only when restored highlight belongs to another page', async () => {
    const highlight = { ...makeHighlight(), url: 'https://other.com/page' };
    const messageBus = {
      send: vi.fn().mockResolvedValue({ success: true, data: highlight }),
      subscribe: vi.fn(),
      publish: vi.fn(),
    };
    const { modeManager, repositoryFacade, deps } = makeDeps({ messageBus });

    await handleLibraryDataChanged(
      { source: 'undo_delete', restoredIds: [HIGHLIGHT_ID] },
      deps,
    );

    expect(repositoryFacade.rehydrate).toHaveBeenCalled();
    expect(modeManager.createFromData).not.toHaveBeenCalled();
  });

  it('detaches highlights listed in auth_sign_out removedIds', async () => {
    const { modeManager, deps } = makeDeps();

    await handleLibraryDataChanged(
      { source: 'auth_sign_out', removedIds: [HIGHLIGHT_ID] },
      deps,
    );

    expect(modeManager.detachHighlightFromPage).toHaveBeenCalledWith(HIGHLIGHT_ID);
  });
});
