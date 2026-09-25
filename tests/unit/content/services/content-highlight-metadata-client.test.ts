import { describe, expect, it, vi } from 'vitest';

import { ContentHighlightMetadataClient } from '@/content/services/content-highlight-metadata-client';
import { UPDATE_HIGHLIGHT_METADATA } from '@/shared/schemas/message-schemas';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

function client(send: ReturnType<typeof vi.fn>) {
  return new ContentHighlightMetadataClient({ send } as unknown as IMessageBus);
}

describe('ContentHighlightMetadataClient', () => {
  it('sends one metadata field to the background', async () => {
    const send = vi.fn().mockResolvedValue({ success: true, data: undefined });
    const result = await client(send).update({ id: 'hl-1', tags: ['css'] });
    expect(result).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(
      'background',
      expect.objectContaining({
        type: UPDATE_HIGHLIGHT_METADATA,
        payload: { id: 'hl-1', tags: ['css'] },
      })
    );
  });

  it('maps a tags gate code and hides other failures', async () => {
    const send = vi.fn().mockResolvedValue({ success: false, error: 'AUTH_REQUIRED' });
    await expect(client(send).update({ id: 'hl-1', tags: ['css'] })).resolves.toEqual({
      ok: false,
      error: 'Sign in to add tags.',
    });
    send.mockResolvedValueOnce({ success: false, error: 'Highlight not found: hl-1' });
    await expect(client(send).update({ id: 'hl-1', notes: 'x' })).resolves.toEqual({
      ok: false,
      error: "Couldn't save. Try again.",
    });
  });
});
