import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ForwardingAuditLogger } from '@/background/auth/forwarding-audit-logger';
import { ServerAuditSink } from '@/background/auth/server-audit-sink';

const noopLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  setLevel: vi.fn(),
  getLevel: vi.fn(() => 1),
};

describe('ServerAuditSink', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts auth events with the user token and never throws on outage', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
    const sink = new ServerAuditSink(
      'https://proj.supabase.co',
      'anon-key',
      async () => 'user-jwt',
      noopLogger as any
    );

    await sink.forward('LOGIN', 'user-1', 'google');

    expect(fetch).toHaveBeenCalledWith(
      'https://proj.supabase.co/functions/v1/auth-audit',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer user-jwt' }),
      })
    );
  });

  it('stays local-only when there is no session and swallows fetch errors', async () => {
    const sink = new ServerAuditSink(
      'https://proj.supabase.co',
      'anon-key',
      async () => null,
      noopLogger as any
    );
    await expect(sink.forward('LOGIN_FAILED', 'unknown')).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();

    const failing = new ServerAuditSink(
      'https://proj.supabase.co',
      'anon-key',
      async () => 'user-jwt',
      noopLogger as any
    );
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    await expect(failing.forward('LOGOUT', 'user-1')).resolves.toBeUndefined();
  });
});

describe('ForwardingAuditLogger', () => {
  it('writes locally first, then forwards auth events best-effort', async () => {
    const inner = {
      logAuthEvent: vi.fn().mockResolvedValue(undefined),
      logSecurityEvent: vi.fn().mockResolvedValue(undefined),
      logDataAccess: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
    };
    const sink = { forward: vi.fn().mockResolvedValue(undefined) };
    const forwarding = new ForwardingAuditLogger(inner as any, sink as any);

    await forwarding.logAuthEvent({
      action: 'LOGIN',
      userId: 'user-1',
      provider: 'google',
    });

    expect(inner.logAuthEvent).toHaveBeenCalledTimes(1);
    expect(sink.forward).toHaveBeenCalledWith('LOGIN', 'user-1', 'google');
  });

  it('keeps data-access events local-only', async () => {
    const inner = {
      logAuthEvent: vi.fn(),
      logSecurityEvent: vi.fn(),
      logDataAccess: vi.fn().mockResolvedValue(undefined),
      query: vi.fn(),
    };
    const sink = { forward: vi.fn() };
    const forwarding = new ForwardingAuditLogger(inner as any, sink as any);

    await forwarding.logDataAccess({ action: 'READ', userId: 'user-1' });

    expect(inner.logDataAccess).toHaveBeenCalledTimes(1);
    expect(sink.forward).not.toHaveBeenCalled();
  });
});
