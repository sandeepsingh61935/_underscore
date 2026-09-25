import { toAuthStatePayload } from './auth-state-payload';
import { AUTH_SESSION_CLEARED, AUTH_STATE_CHANGED } from './constants';

import type { AuthState } from '@/background/auth/interfaces/i-auth-manager';

function runtimeMessage(payload: Record<string, unknown>): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return;
  }

  chrome.runtime.sendMessage(payload).catch(() => {
    // Popup / content may be closed.
  });
}

function broadcastToTabs(message: Record<string, unknown>): void {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return;
  }

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id) continue;
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Tab may not have content script.
      });
    }
  });
}

/** Storage key for the SW-free cached auth payload (hybrid session → local, NO TTL). */
export const AUTH_CACHED_STATE_KEY = 'auth_cached_state';

/**
 * Persist auth payload where the popup can read it without waking the SW
 * (chrome.storage needs no service worker). Best-effort, never throws.
 */
export function cacheAuthState(state: AuthState): void {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage) return;
    const payload = toAuthStatePayload(state);
    const record = { [AUTH_CACHED_STATE_KEY]: payload };
    chrome.storage.session?.set?.(record)?.catch?.(() => {});
    chrome.storage.local?.set?.(record)?.catch?.(() => {});
  } catch {
    // ignore
  }
}

/** Broadcast auth state to popup, content scripts, and other extension contexts. */
export function broadcastAuthStateChange(state: AuthState): void {
  const payload = toAuthStatePayload(state);
  const message = {
    type: AUTH_STATE_CHANGED,
    payload,
    timestamp: Date.now(),
  };

  cacheAuthState(state);
  runtimeMessage(message);
  broadcastToTabs(message);
}

/** Notify web app tabs that the extension session was cleared. */
export function broadcastAuthSessionCleared(): void {
  const message = {
    type: AUTH_SESSION_CLEARED,
    payload: {},
    timestamp: Date.now(),
  };

  runtimeMessage(message);
  broadcastToTabs(message);
}
