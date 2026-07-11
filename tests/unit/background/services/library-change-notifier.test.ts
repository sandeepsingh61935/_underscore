import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LIBRARY_DATA_CHANGED } from '@/shared/schemas/message-schemas';

const sendMessage = vi.fn().mockResolvedValue(undefined);
const tabsQuery = vi.fn().mockResolvedValue([]);
const tabsSendMessage = vi.fn().mockResolvedValue(undefined);

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      sendMessage: (...args: unknown[]) => sendMessage(...args),
    },
    tabs: {
      query: (...args: unknown[]) => tabsQuery(...args),
      sendMessage: (...args: unknown[]) => tabsSendMessage(...args),
    },
  },
}));

describe('notifyLibraryDataChanged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('defers broadcast until after the current task (IPC sendResponse can finish first)', async () => {
    const { notifyLibraryDataChanged } = await import(
      '@/background/services/library-change-notifier'
    );

    notifyLibraryDataChanged({ source: 'delete', deletedCount: 2, removedIds: ['a', 'b'] });

    expect(sendMessage).not.toHaveBeenCalled();

    await Promise.resolve();

    expect(sendMessage).toHaveBeenCalledWith({
      type: LIBRARY_DATA_CHANGED,
      payload: { source: 'delete', deletedCount: 2, removedIds: ['a', 'b'] },
    });
  });
});
