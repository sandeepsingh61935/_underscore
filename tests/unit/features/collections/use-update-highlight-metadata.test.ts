/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { executeUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('executeUpdateHighlightMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends notes and tags to the background update channel', async () => {
    const sendUpdate = vi.fn(async () => ({ success: true }));

    const ok = await executeUpdateHighlightMetadata(
      'h-1',
      { notes: 'Key point', tags: ['research'] },
      sendUpdate
    );

    expect(ok).toBe(true);
    expect(sendUpdate).toHaveBeenCalledWith({
      id: 'h-1',
      notes: 'Key point',
      tags: ['research'],
    });
    expect(toast.success).toHaveBeenCalledWith('Saved');
  });

  it('surfaces errors when the update fails', async () => {
    const sendUpdate = vi.fn(async () => ({
      success: false,
      error: 'Highlight not found',
    }));

    const ok = await executeUpdateHighlightMetadata(
      'missing',
      { notes: 'x' },
      sendUpdate
    );

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('Highlight not found');
  });
});
