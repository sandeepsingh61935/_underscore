import { afterEach, describe, expect, it, vi } from 'vitest';

describe('isAuthEmailUiEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is false when env unset', async () => {
    vi.stubEnv('VITE_AUTH_EMAIL_UI', '');
    const { isAuthEmailUiEnabled } = await import('../auth-email-ui');
    expect(isAuthEmailUiEnabled()).toBe(false);
  });

  it('is false when env is not the string true', async () => {
    vi.stubEnv('VITE_AUTH_EMAIL_UI', '1');
    const { isAuthEmailUiEnabled } = await import('../auth-email-ui');
    expect(isAuthEmailUiEnabled()).toBe(false);
  });

  it('is true only for exact true', async () => {
    vi.stubEnv('VITE_AUTH_EMAIL_UI', 'true');
    const { isAuthEmailUiEnabled } = await import('../auth-email-ui');
    expect(isAuthEmailUiEnabled()).toBe(true);
  });
});
