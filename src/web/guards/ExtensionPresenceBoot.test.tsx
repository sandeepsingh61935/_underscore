import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

import { ExtensionPresenceBoot } from './ExtensionPresenceBoot';

const useWebAuthMock = vi.fn();

vi.mock('@/features/auth/providers/WebAuthProvider', () => ({
  useWebAuth: () => useWebAuthMock(),
}));

vi.mock('@/shared/extension/extension-presence', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/extension/extension-presence')
  >('@/shared/extension/extension-presence');
  return {
    ...actual,
    pingExtensionPresence: vi.fn(async () => ({ presence: 'missing' as const })),
  };
});

function renderBoot(
  opts: {
    authStatus?: 'loading' | 'authenticated' | 'unauthenticated';
    initial?: string;
  } = {}
) {
  useWebAuthMock.mockReturnValue({
    status: opts.authStatus ?? 'unauthenticated',
  });
  return render(
    <MemoryRouter initialEntries={[opts.initial ?? '/home']}>
      <Routes>
        <Route element={<ExtensionPresenceBoot />}>
          <Route path="/home" element={<div data-od-id="home-ok">Home</div>} />
          <Route path="/library" element={<div data-od-id="lib-ok">Lib</div>} />
        </Route>
        <Route path="/" element={<div data-od-id="welcome-ok">Welcome</div>} />
        <Route path="/privacy" element={<div data-od-id="privacy-ok">Privacy</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ExtensionPresenceBoot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product routes when auth is ready (no welcome redirect)', async () => {
    renderBoot({ initial: '/home' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="home-ok"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="welcome-ok"]')).toBeNull();
  });

  it('renders /library when auth is ready', async () => {
    renderBoot({ initial: '/library' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="lib-ok"]')).toBeTruthy();
    });
  });

  it('auth loading: neutral boot, no product outlet', () => {
    renderBoot({
      authStatus: 'loading',
      initial: '/home',
    });
    expect(document.querySelector('[data-od-id="auth-boot"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-ok"]')).toBeNull();
    expect(document.querySelector('[data-od-id="home-ok"]')).toBeNull();
  });

  it('public routes remain reachable without boot (privacy)', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route path="/privacy" element={<div data-od-id="privacy-ok">Privacy</div>} />
          <Route path="/" element={<div data-od-id="welcome-ok">Welcome</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.querySelector('[data-od-id="privacy-ok"]')).toBeTruthy();
  });
});
