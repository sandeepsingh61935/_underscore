/**
 * Best-effort web → extension presence ping (PRD 2026-08-23 hard gate).
 * Not cryptographic proof; SPA gate only. Fail closed on timeout/error.
 * Lives under shared/ (not src/web) because it touches the extension runtime API.
 */

import { EXTENSION_PING } from '@/shared/auth/constants';

export type ExtensionPresence = 'installed' | 'missing' | 'unknown';

export type ExtensionPingResult = {
  presence: ExtensionPresence;
  version?: string;
};

export type ExtensionPingDeps = {
  sendPing?: () => Promise<{ ok: boolean; version?: string }>;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 800;

/**
 * Stable Chrome extension id derived from the public key in the Chrome manifest
 * (wxt.config.ts `key`). Used when VITE_EXTENSION_ID is unset so web→extension
 * ping works for production/dev builds that embed that key.
 */
const DEFAULT_CHROME_EXTENSION_ID = 'hecejpjekcgpifnemddfmkjmphmgljlm';

type RuntimeLike = {
  id?: string;
  lastError?: { message?: string };
  sendMessage: (
    extensionIdOrMessage: string | unknown,
    messageOrCb?: unknown,
    cb?: (response: unknown) => void,
  ) => void;
};

function getRuntime(): RuntimeLike | null {
  const g = globalThis as typeof globalThis & { chrome?: { runtime?: RuntimeLike } };
  const runtime = g.chrome?.runtime;
  if (!runtime || typeof runtime.sendMessage !== 'function') {
    return null;
  }
  return runtime;
}

function getTargetExtensionId(runtime: RuntimeLike): string | undefined {
  const fromEnv = import.meta.env['VITE_EXTENSION_ID'] as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.trim();
  }
  if (runtime.id) {
    return runtime.id;
  }
  return DEFAULT_CHROME_EXTENSION_ID;
}

function runtimeSend(
  runtime: RuntimeLike,
  extensionId: string | undefined,
  message: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    try {
      if (extensionId) {
        runtime.sendMessage(extensionId, message, (response: unknown) => {
          if (runtime.lastError?.message) {
            reject(new Error(runtime.lastError.message));
            return;
          }
          resolve(response);
        });
        return;
      }
      runtime.sendMessage(message, (response: unknown) => {
        if (runtime.lastError?.message) {
          reject(new Error(runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

function parsePingResponse(response: unknown): { ok: boolean; version?: string } {
  if (!response || typeof response !== 'object') {
    return { ok: false };
  }
  const r = response as Record<string, unknown>;
  if (r['success'] === true && r['data'] && typeof r['data'] === 'object') {
    const data = r['data'] as Record<string, unknown>;
    const version = typeof data['version'] === 'string' ? data['version'] : undefined;
    if (data['ok'] === true) {
      return { ok: true, version };
    }
  }
  if (r['ok'] === true) {
    const version = typeof r['version'] === 'string' ? r['version'] : undefined;
    return { ok: true, version };
  }
  return { ok: false };
}

async function defaultSendPing(): Promise<{ ok: boolean; version?: string }> {
  const runtime = getRuntime();
  if (!runtime) {
    return { ok: false };
  }
  const extensionId = getTargetExtensionId(runtime);
  // From a normal web page, runtime.id is unset — must have VITE_EXTENSION_ID.
  if (!extensionId) {
    return { ok: false };
  }
  const message = {
    type: EXTENSION_PING,
    payload: {},
    timestamp: Date.now(),
  };
  const response = await runtimeSend(runtime, extensionId, message);
  return parsePingResponse(response);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('EXTENSION_PING_TIMEOUT')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function pingExtensionPresence(
  deps: ExtensionPingDeps = {},
): Promise<ExtensionPingResult> {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const send = deps.sendPing ?? defaultSendPing;
  try {
    const result = await withTimeout(send(), timeoutMs);
    if (result.ok) {
      return { presence: 'installed', version: result.version };
    }
    return { presence: 'missing' };
  } catch {
    return { presence: 'missing' };
  }
}

export function shouldBlockGuestProductAccess(input: {
  isAuthenticated: boolean;
  presence: ExtensionPresence;
}): boolean {
  if (input.isAuthenticated) {
    return false;
  }
  return input.presence !== 'installed';
}
