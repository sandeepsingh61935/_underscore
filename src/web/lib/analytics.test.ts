import { afterEach, describe, expect, it, vi } from 'vitest';

import { trackEvent } from './analytics';

describe('trackEvent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('beacons allowlisted events', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
    trackEvent('library_open', { client: 'phone', quote: 'nope' });
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith(
      '/api/analytics',
      expect.any(Blob)
    );
  });

  it('does not beacon unknown names', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
    trackEvent('related_tag_clicked', { rank: 1 });
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
