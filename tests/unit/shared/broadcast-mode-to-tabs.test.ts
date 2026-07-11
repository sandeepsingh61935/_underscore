import { describe, it, expect, vi, beforeEach } from 'vitest';
import { broadcastModeToTabs } from '@/shared/services/broadcast-mode-to-tabs';

describe('broadcastModeToTabs', () => {
  beforeEach(() => {
    global.chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, {}]),
        sendMessage: vi.fn().mockResolvedValue(undefined),
      },
    } as unknown as typeof chrome;
  });

  it('sends SET_MODE to all tabs with ids', async () => {
    await broadcastModeToTabs('pro');

    expect(chrome.tabs.query).toHaveBeenCalledWith({});
    expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: 'SET_MODE',
      mode: 'pro',
    });
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(2, {
      type: 'SET_MODE',
      mode: 'pro',
    });
  });

  it('no-ops when chrome.tabs is unavailable', async () => {
    global.chrome = {} as typeof chrome;
    await expect(broadcastModeToTabs('basic')).resolves.toBeUndefined();
  });
});
