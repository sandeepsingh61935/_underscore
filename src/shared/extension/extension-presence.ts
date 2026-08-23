/**
 * Best-effort web → extension presence detection (install gate).
 * Channels (any success = installed):
 *  1) DOM attribute data-underscore-ext (content script)
 *  2) window postMessage from presence content script
 *  3) chrome.runtime EXTENSION_PING (externally_connectable)
 */

import { EXTENSION_PING } from '@/shared/auth/constants';

export type ExtensionPresence = 'installed' | 'missing' | 'unknown';

export type ExtensionPingResult = {
  presence: ExtensionPresence;
  version?: string;
  via?: 'dom' | 'postMessage' | 'ping';
  /** Structured debug for install UI (safe to show). */
  debug?: PresenceDebug;
};

export type PresenceDebug = {
  attr: string | null;
  hasRuntimeSend: boolean;
  extensionIdTried: string | null;
  pingError: string | null;
  pingResponse: unknown;
  postMessageHeard: boolean;
};

export type ExtensionPingDeps = {
  sendPing?: () => Promise<{
    ok: boolean;
    version?: string;
    via?: ExtensionPingResult['via'];
    debug?: PresenceDebug;
  }>;
  timeoutMs?: number;
  skipDomPoll?: boolean;
};

const DEFAULT_TIMEOUT_MS = 2000;
const DOM_POLL_MS = 800;
const DOM_POLL_STEP_MS = 50;
const MSG_SOURCE = 'underscore-extension';

/** Stable Chrome id from wxt.config.ts public key. */
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

function getTargetExtensionId(runtime: RuntimeLike): string {
  const fromEnv = import.meta.env['VITE_EXTENSION_ID'] as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.trim();
  }
  if (runtime.id) {
    return runtime.id;
  }
  return DEFAULT_CHROME_EXTENSION_ID;
}

function readDomAttr(): string | null {
  try {
    if (typeof document === 'undefined') return null;
    return document.documentElement.getAttribute(EXT_ATTR)?.trim() || null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForPostMessage(budgetMs: number): Promise<string | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMsg);
      resolve(v);
    };
    const onMsg = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      const d = data as Record<string, unknown>;
      if (d['source'] !== MSG_SOURCE) return;
      if (d['type'] !== 'EXTENSION_PRESENT') return;
      const version = typeof d['version'] === 'string' ? d['version'] : '1';
      finish(version);
    };
    window.addEventListener('message', onMsg);
    window.setTimeout(() => finish(null), budgetMs);
  });
}

function runtimeSend(
  runtime: RuntimeLike,
  extensionId: string,
  message: unknown,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    try {
      runtime.sendMessage(extensionId, message, (response: unknown) => {
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

function parsePingResponse(response: unknown): {
  ok: boolean;
  version?: string;
  error?: string;
} {
  if (!response || typeof response !== 'object') {
    return { ok: false, error: 'empty_response' };
  }
  const r = response as Record<string, unknown>;
  if (r['success'] === true && r['data'] && typeof r['data'] === 'object') {
    const data = r['data'] as Record<string, unknown>;
    const version = typeof data['version'] === 'string' ? data['version'] : undefined;
    if (data['ok'] === true) {
      return { ok: true, version };
    }
    return { ok: false, error: 'success_without_ok' };
  }
  if (r['success'] === false) {
    const err =
      typeof r['error'] === 'string'
        ? r['error']
        : typeof r['code'] === 'string'
          ? r['code']
          : 'success_false';
    return { ok: false, error: err };
  }
  if (r['ok'] === true) {
    const version = typeof r['version'] === 'string' ? r['version'] : undefined;
    return { ok: true, version };
  }
  return { ok: false, error: 'unrecognized_response' };
}

async function defaultSendPing(opts: {
  skipDomPoll?: boolean;
}): Promise<{
  ok: boolean;
  version?: string;
  via?: ExtensionPingResult['via'];
  debug: PresenceDebug;
}> {
  const debug: PresenceDebug = {
    attr: readDomAttr(),
    hasRuntimeSend: false,
    extensionIdTried: null,
    pingError: null,
    pingResponse: null,
    postMessageHeard: false,
  };

  // 1) DOM attribute
  if (debug.attr) {
    return { ok: true, version: debug.attr, via: 'dom', debug };
  }
  if (!opts.skipDomPoll) {
    const deadline = Date.now() + DOM_POLL_MS;
    while (Date.now() < deadline) {
      await sleep(DOM_POLL_STEP_MS);
      debug.attr = readDomAttr();
      if (debug.attr) {
        return { ok: true, version: debug.attr, via: 'dom', debug };
      }
    }
  }

  // 2) postMessage (parallel short wait — presence re-announces)
  const pm = await waitForPostMessage(400);
  if (pm) {
    debug.postMessageHeard = true;
    debug.attr = readDomAttr();
    return { ok: true, version: pm, via: 'postMessage', debug };
  }

  // 3) runtime ping
  const runtime = getRuntime();
  debug.hasRuntimeSend = Boolean(runtime);
  if (!runtime) {
    return { ok: false, debug };
  }
  const extensionId = getTargetExtensionId(runtime);
  debug.extensionIdTried = extensionId;
  try {
    const response = await runtimeSend(runtime, extensionId, {
      type: EXTENSION_PING,
      payload: {},
      timestamp: Date.now(),
    });
    debug.pingResponse = response;
    const parsed = parsePingResponse(response);
    if (parsed.ok) {
      return { ok: true, version: parsed.version, via: 'ping', debug };
    }
    debug.pingError = parsed.error ?? 'invalid_ping_response';
  } catch (e) {
    debug.pingError = e instanceof Error ? e.message : String(e);
  }

  debug.attr = readDomAttr();
  return { ok: false, debug };
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
        debug: result.debug,
      };
    }
    return { presence: 'missing', debug: result.debug };
  } catch (e) {
    return {
      presence: 'missing',
      debug: {
        attr: readDomAttr(),
        hasRuntimeSend: Boolean(getRuntime()),
        extensionIdTried: null,
        pingError: e instanceof Error ? e.message : String(e),
        pingResponse: null,
        postMessageHeard: false,
      },
    };
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

export function formatPresenceDebug(debug: PresenceDebug | undefined): string {
  if (!debug) return '';
  return [
    `attr=${debug.attr ?? 'null'}`,
    `runtimeSend=${debug.hasRuntimeSend ? 'yes' : 'no'}`,
    `id=${debug.extensionIdTried ?? 'null'}`,
    `pingErr=${debug.pingError ?? 'null'}`,
    `postMessage=${debug.postMessageHeard ? 'yes' : 'no'}`,
  ].join(' · ');
}
