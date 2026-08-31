import type { Session } from '@supabase/supabase-js';

import { SYNC_AUTH_SESSION } from './constants';

export interface SessionBridgePayload {
  access_token: string;
  refresh_token: string;
}

function hasChromeRuntime(): boolean {
  return (
    typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function'
  );
}

/**
 * Extension ID for external web → extension messaging.
 * Required when the web app runs outside the extension origin.
 */
function getTargetExtensionId(): string | undefined {
  const fromEnv = import.meta.env['VITE_EXTENSION_ID'] as string | undefined;
  if (fromEnv) {
    return fromEnv;
  }

  if (hasChromeRuntime() && chrome.runtime.id) {
    return chrome.runtime.id;
  }

  return undefined;
}

async function sendSessionMessage(payload: SessionBridgePayload | null): Promise<void> {
  if (!hasChromeRuntime()) {
    return;
  }

  const extensionId = getTargetExtensionId();
  const message = {
    type: SYNC_AUTH_SESSION,
    payload,
    timestamp: Date.now(),
  };

  if (extensionId) {
    await chrome.runtime.sendMessage(extensionId, message);
    return;
  }

  await chrome.runtime.sendMessage(message);
}

/** Push web Supabase session tokens to the extension background. */
export async function syncSessionToExtension(session: Session | null): Promise<void> {
  if (!session?.access_token || !session.refresh_token) {
    return;
  }

  try {
    await sendSessionMessage({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch {
    // Extension may not be installed.
  }
}

/** Ask extension background to clear its session (web sign-out helper). */
export async function clearExtensionSession(): Promise<void> {
  try {
    await sendSessionMessage(null);
  } catch {
    // Extension may not be installed.
  }
}

export function isExtensionInstalled(): boolean {
  return (
    Boolean(getTargetExtensionId()) || (hasChromeRuntime() && Boolean(chrome.runtime.id))
  );
}
