import { describe, expect, it, vi } from 'vitest';

import type { DeleteResult } from '@/background/services/highlight-delete-service';
import { ContentHighlightDeleteClient } from '@/content/services/content-highlight-delete';
import {
  IPC_HIGHLIGHT_DELETE_SCOPE,
  IPC_HIGHLIGHT_UNDO_DELETE,
} from '@/shared/schemas/message-schemas';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

function makeBus(response: {
  success: boolean;
  data?: DeleteResult;
  error?: string;
}): IMessageBus {
  return {
    send: vi.fn().mockResolvedValue(response),
    subscribe: vi.fn(),
    publish: vi.fn(),
  };
}

describe('ContentHighlightDeleteClient', () => {
  it('deletes a highlight through IPC_HIGHLIGHT_DELETE_SCOPE', async () => {
    const bus = makeBus({ success: true, data: { success: true, deletedCount: 1 } });
    const client = new ContentHighlightDeleteClient(bus);

    const result = await client.deleteHighlight('abc-123');

    expect(bus.send).toHaveBeenCalledWith('background', {
      type: IPC_HIGHLIGHT_DELETE_SCOPE,
      payload: { scope: 'highlight', id: 'abc-123' },
      timestamp: expect.any(Number),
    });
    expect(result).toEqual({ ok: true, data: { success: true, deletedCount: 1 } });
  });

  it('undoes the last delete through IPC_HIGHLIGHT_UNDO_DELETE', async () => {
    const bus = makeBus({ success: true, data: { success: true, deletedCount: 0 } });
    const client = new ContentHighlightDeleteClient(bus);

    const result = await client.undoDelete();

    expect(bus.send).toHaveBeenCalledWith('background', {
      type: IPC_HIGHLIGHT_UNDO_DELETE,
      payload: {},
      timestamp: expect.any(Number),
    });
    expect(result).toEqual({ ok: true, data: { success: true, deletedCount: 0 } });
  });
});
