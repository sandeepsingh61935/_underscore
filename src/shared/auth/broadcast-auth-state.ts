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

/** Broadcast auth state to popup, content scripts, and other extension contexts. */
export function broadcastAuthStateChange(state: AuthState): void {
  const payload = toAuthStatePayload(state);
  const message = {
    type: AUTH_STATE_CHANGED,
    payload,
    timestamp: Date.now(),
  };

  runtimeMessage(message);
  broadcastToTabs(message);
}

/** Notify web app tabs that the extension session was cleared. */
export function broadcastAuthSessionCleared(): void {
  const message = {
    type: AUTH_SESSION_CLEARED,
    timestamp: Date.now(),
  };

  runtimeMessage(message);
  broadcastToTabs(message);
}
