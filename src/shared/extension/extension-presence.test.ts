import { describe, expect, it } from 'vitest';

import {
  pingExtensionPresence,
  shouldBlockGuestProductAccess,
} from './extension-presence';

describe('extension-presence', () => {
  it('maps successful ping to installed', async () => {
    const r = await pingExtensionPresence({
      sendPing: async () => ({ ok: true, version: '0.1.1' }),
    });
    expect(r.presence).toBe('installed');
    expect(r.version).toBe('0.1.1');
  });

  it('maps failed ping body to missing', async () => {
    const r = await pingExtensionPresence({
      sendPing: async () => ({ ok: false }),
    });
    expect(r.presence).toBe('missing');
  });

  it('maps timeout/error to missing (fail closed)', async () => {
    const r = await pingExtensionPresence({
      timeoutMs: 30,
      sendPing: () => new Promise(() => undefined),
    });
    expect(r.presence).toBe('missing');
  });

  it('maps throw to missing', async () => {
    const r = await pingExtensionPresence({
      sendPing: async () => {
        throw new Error('no ext');
      },
    });
    expect(r.presence).toBe('missing');
  });

  it('detects DOM marker without runtime ping', async () => {
    document.documentElement.setAttribute('data-underscore-ext', '9.9.9');
    const r = await pingExtensionPresence({ skipDomPoll: true });
    document.documentElement.removeAttribute('data-underscore-ext');
    expect(r.presence).toBe('installed');
    expect(r.version).toBe('9.9.9');
    expect(r.via).toBe('dom');
  });

  it('includes debug when missing', async () => {
    const r = await pingExtensionPresence({
      sendPing: async () => ({
        ok: false,
        debug: {
          attr: null,
          hasRuntimeSend: false,
          extensionIdTried: null,
          pingError: null,
          pingResponse: null,
          postMessageHeard: false,
        },
      }),
    });
    expect(r.presence).toBe('missing');
    expect(r.debug?.hasRuntimeSend).toBe(false);
  });

  it('shouldBlockGuestProductAccess: guest missing blocked, installed ok', () => {
    expect(
      shouldBlockGuestProductAccess({ isAuthenticated: false, presence: 'missing' }),
    ).toBe(true);
    expect(
      shouldBlockGuestProductAccess({ isAuthenticated: false, presence: 'unknown' }),
    ).toBe(true);
    expect(
      shouldBlockGuestProductAccess({ isAuthenticated: false, presence: 'installed' }),
    ).toBe(false);
  });

  it('shouldBlockGuestProductAccess: signed-in never blocked', () => {
    expect(
      shouldBlockGuestProductAccess({ isAuthenticated: true, presence: 'missing' }),
    ).toBe(false);
  });
});
