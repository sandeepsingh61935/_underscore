import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/**
 * Notify all content scripts of a mode change via SET_MODE IPC.
 * Fire-and-forget per tab; missing receivers (chrome://, etc.) are ignored.
 */
export async function broadcastModeToTabs(
  mode: ModeType,
  isAuthenticated = false,
): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query || !chrome.tabs?.sendMessage) {
    return;
  }

  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((tab) => {
      if (tab.id === undefined) return Promise.resolve();
      return chrome.tabs
        .sendMessage(tab.id, { type: 'SET_MODE', mode, isAuthenticated })
        .catch(() => undefined);
    })
  );
}
