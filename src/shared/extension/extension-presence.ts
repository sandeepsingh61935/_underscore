/**
 * Best-effort web → extension presence detection (PRD 2026-08-23 hard gate).
 * Order: DOM marker from content script → runtime EXTENSION_PING.
 * Not cryptographic proof; SPA gate only. Fail closed on timeout/error.
 */

import { EXTENSION_PING } from '@/shared/auth/constants';

export type ExtensionPresence = 'installed' | 'missing' | 'unknown';

export type ExtensionPingResult = {
  presence: ExtensionPresence;
  version?: string;
  via?: 'dom' | 'ping';
};

export type ExtensionPingDeps = {
  sendPing?: () => Promise<{ ok: boolean; version?: string; via?: 'dom' | 'ping' }>;
  timeoutMs?: number;
  /** Skip short DOM poll (tests). */
  skipDomPoll?: boolean;
};

const DEFAULT_TIMEOUT_MS = 1200;
const DOM_POLL_MS = 400;
const DOM_POLL_STEP_MS = 50;

/**
 * Stable Chrome extension id derived from the public key in the Chrome manifest
 * (wxt.config.ts `key`). Used when VITE_EXTENSION_ID is unset.
 */
const DEFAULT_CHROME_EXTENSION_ID = 'hecejpjekcgpifnemddfmkjmphmgljlm';

const EXT_ATTR = 'data-underscore-ext';

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
  const g = globalThis as typeof globalThis & {
    chrome?: { runtime?: RuntimeLike };
    browser?: { runtime?: RuntimeLike };
  };
  const runtime = g.chrome?.runtime ?? g.browser?.runtime;
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

function readDomPresence(): { ok: true; version: string; via: 'dom' } | { ok: false } {
  try {
    if (typeof document === 'undefined') {
      return { ok: false };
    }
    const v = document.documentElement.getAttribute(EXT_ATTR)?.trim();
    if (v) {
      return { ok: true, version: v, via: 'dom' };
    }
  } catch {
    /* ignore */
  }
  return { ok: false };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function pollDomPresence(
  budgetMs: number,
): Promise<{ ok: true; version: string; via: 'dom' } | { ok: false }> {
  const deadline = Date.now() + budgetMs;
  let hit = readDomPresence();
  while (!hit.ok && Date.now() < deadline) {
    await sleep(DOM_POLL_STEP_MS);
    hit = readDomPresence();
  }
  return hit;
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

async function defaultSendPing(opts: {
  skipDomPoll?: boolean;
}): Promise<{ ok: boolean; version?: string; via?: 'dom' | 'ping' }> {
  // 1) Content-script DOM marker (works without externally_connectable).
  const immediate = readDomPresence();
  if (immediate.ok) {
    return immediate;
  }
  if (!opts.skipDomPoll) {
    const polled = await pollDomPresence(DOM_POLL_MS);
    if (polled.ok) {
      return polled;
    }
  }

  // 2) Runtime ping (requires rebuilt extension + matching extension id).
  const runtime = getRuntime();
  if (!runtime) {
    return { ok: false };
  }
  const extensionId = getTargetExtensionId(runtime);
  if (!extensionId) {
    return { ok: false };
  }
  const message = {
    type: EXTENSION_PING,
    payload: {},
    timestamp: Date.now(),
  };
  const response = await runtimeSend(runtime, extensionId, message);
  const parsed = parsePingResponse(response);
  if (parsed.ok) {
    return { ok: true, version: parsed.version, via: 'ping' };
  }
  return { ok: false };
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
  const send =
    deps.sendPing ??
    (() => defaultSendPing({ skipDomPoll: deps.skipDomPoll }));
  try {
    const result = await withTimeout(send(), timeoutMs);
    if (result.ok) {
      return {
        presence: 'installed',
        version: result.version,
        via: result.via,
      };
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
