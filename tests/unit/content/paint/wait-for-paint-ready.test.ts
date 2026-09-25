import { describe, expect, it, vi } from 'vitest';

import { waitForPaintReady } from '@/content/paint/wait-for-paint-ready';

describe('waitForPaintReady', () => {
  it('double-rAFs when the document is already complete', async () => {
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    await waitForPaintReady(document, raf);
    expect(raf).toHaveBeenCalledTimes(2);
  });
});
