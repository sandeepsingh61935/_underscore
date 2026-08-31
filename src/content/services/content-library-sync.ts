import type { ModeManager } from '@/content/modes/mode-manager';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import { IPC_HIGHLIGHT_GET } from '@/shared/schemas/message-schemas';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface LibraryChangePayload {
  source: string;
  deletedCount?: number;
  removedIds?: string[];
  restoredIds?: string[];
}

export interface ContentLibrarySyncLogger {
  warn(message: string, context?: Record<string, unknown>): void;
}

export interface ContentLibrarySyncDeps {
  modeManager: ModeManager;
  repositoryFacade: RepositoryFacade;
  messageBus: IMessageBus;
  currentUrl: string;
  deserializeRange: (range: SerializedRange) => Range | null;
  logger: ContentLibrarySyncLogger;
}

export async function handleLibraryDataChanged(
  payload: LibraryChangePayload,
  deps: ContentLibrarySyncDeps
): Promise<void> {
  if (payload.removedIds?.length) {
    for (const id of payload.removedIds) {
      if (deps.repositoryFacade.has(id)) {
        await deps.modeManager.detachHighlightFromPage(id);
      }
    }
  }

  if (payload.restoredIds?.length) {
    for (const id of payload.restoredIds) {
      await restoreHighlightOnPage(id, deps);
    }
  }
}

async function restoreHighlightOnPage(
  id: string,
  deps: ContentLibrarySyncDeps
): Promise<void> {
  if (deps.modeManager.getHighlight(id)) {
    return;
  }

  const response = await deps.messageBus.send<MessageResponse<HighlightDataV2>>(
    'background',
    {
      type: IPC_HIGHLIGHT_GET,
      payload: { id },
      timestamp: Date.now(),
    }
  );

  if (!response?.success || !response.data) {
    deps.logger.warn('[LibrarySync] Could not fetch restored highlight', { id });
    return;
  }

  const highlight = response.data;

  const highlightUrl = highlight.url ? normalizePageUrl(highlight.url) : '';
  const onCurrentPage = Boolean(
    highlightUrl && highlightUrl === normalizePageUrl(deps.currentUrl)
  );

  if (!onCurrentPage) {
    deps.repositoryFacade.rehydrate(highlight);
    return;
  }

  const serializedRanges = highlight.ranges ?? [];
  if (serializedRanges.length === 0) {
    deps.logger.warn('[LibrarySync] Restored highlight has no ranges', { id });
    return;
  }

  const liveRanges: Range[] = [];
  for (const serializedRange of serializedRanges) {
    const range = deps.deserializeRange(serializedRange);
    if (range) liveRanges.push(range);
  }

  if (liveRanges.length === 0) {
    deps.logger.warn('[LibrarySync] Could not deserialize ranges for restore', { id });
    return;
  }

  await deps.modeManager.createFromData({
    id: highlight.id,
    text: highlight.text,
    contentHash: highlight.contentHash,
    url: highlight.url,
    colorRole: highlight.colorRole,
    type: 'underscore',
    ranges: serializedRanges,
    liveRanges,
    createdAt: highlight.createdAt,
  });
}
