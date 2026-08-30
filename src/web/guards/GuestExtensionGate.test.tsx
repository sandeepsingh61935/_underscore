import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

import { GuestExtensionGate } from './GuestExtensionGate';

const useAppMock = vi.fn();
const useWebAuthMock = vi.fn();

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => useAppMock(),
}));

vi.mock('@/features/auth/providers/WebAuthProvider', () => ({
  useWebAuth: () => useWebAuthMock(),
}));

function renderGate(
  opts: {
    auth?: boolean;
    authStatus?: 'loading' | 'authenticated' | 'unauthenticated';
    presenceOverride?: 'installed' | 'missing' | 'unknown';
    initial?: string;
  } = {},
) {
  const auth = opts.auth ?? false;
  useAppMock.mockReturnValue({
    isAuthenticated: auth,
  });
  useWebAuthMock.mockReturnValue({
    status:
      opts.authStatus ??
      (auth ? 'authenticated' : 'unauthenticated'),
  });
  return render(
    <MemoryRouter initialEntries={[opts.initial ?? '/home']}>
      <Routes>
        <Route element={<GuestExtensionGate presenceOverride={opts.presenceOverride} />}>
          <Route path="/home" element={<div data-od-id="home-ok">Home</div>} />
          <Route path="/library" element={<div data-od-id="lib-ok">Lib</div>} />
          <Route path="/settings" element={<div data-od-id="set-ok">Set</div>} />
          <Route path="/ask" element={<div data-od-id="ask-ok">Ask</div>} />
          <Route path="/insights" element={<div data-od-id="insights-ok">Insights</div>} />
        </Route>
        <Route path="/" element={<div data-od-id="welcome-ok">Welcome</div>} />
        <Route path="/privacy" element={<div data-od-id="privacy-ok">Privacy</div>} />
        <Route path="/terms" element={<div data-od-id="terms-ok">Terms</div>} />
        <Route path="/help" element={<div data-od-id="help-ok">Help</div>} />
        <Route path="/install" element={<div data-od-id="install-ok">Install</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuestExtensionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guest + missing → redirect to welcome gate ("/" with gate open, not /install)', async () => {
    renderGate({ auth: false, presenceOverride: 'missing', initial: '/home' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="welcome-ok"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="home-ok"]')).toBeNull();
    expect(document.querySelector('[data-od-id="install-ok"]')).toBeNull();
  });

  it('guest + missing on /ask → redirect to welcome gate', async () => {
    renderGate({ auth: false, presenceOverride: 'missing', initial: '/ask' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="welcome-ok"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="ask-ok"]')).toBeNull();
  });

  it('guest + missing on /insights → redirect to welcome gate', async () => {
    renderGate({ auth: false, presenceOverride: 'missing', initial: '/insights' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="welcome-ok"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="insights-ok"]')).toBeNull();
  });

  it('guest + installed → product renders', async () => {
    renderGate({ auth: false, presenceOverride: 'installed', initial: '/library' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="lib-ok"]')).toBeTruthy();
    });
  });

  it('auth loading: neutral boot, no welcome redirect', async () => {
    renderGate({
      auth: false,
      authStatus: 'loading',
      presenceOverride: 'missing',
      initial: '/home',
    });
    expect(document.querySelector('[data-od-id="auth-boot"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-ok"]')).toBeNull();
    expect(document.querySelector('[data-od-id="home-ok"]')).toBeNull();
  });

  it('signed-in + missing presence still allows product', async () => {
    renderGate({ auth: true, presenceOverride: 'missing', initial: '/home' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="home-ok"]')).toBeTruthy();
    });
  });

  it('signed-in + missing → product still renders, no redirect to welcome', async () => {
    renderGate({ auth: true, presenceOverride: 'missing', initial: '/home' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="home-ok"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="welcome-ok"]')).toBeNull();
  });

  it('public routes remain reachable without gate (privacy)', async () => {
    // privacy is outside gate — render directly proves not blocked
    useAppMock.mockReturnValue({ isAuthenticated: false });
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route path="/privacy" element={<div data-od-id="privacy-ok">Privacy</div>} />
          <Route path="/" element={<div data-od-id="welcome-ok">Welcome</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(document.querySelector('[data-od-id="privacy-ok"]')).toBeTruthy();
  });
});
