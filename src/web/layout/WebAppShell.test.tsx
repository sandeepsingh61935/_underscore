import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WebAppShell } from './WebAppShell';
import { ExtensionPresenceProvider } from '@/web/extension-presence-context';
import type { ExtensionPresence } from '@/shared/extension/extension-presence';
import { EXT_NOTICE_PREFS_KEY } from '@/web/lib/extension-notice-prefs';
import { useMobileWebViewport } from '@/web/lib/is-mobile-web-viewport';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

vi.mock('@/web/lib/is-mobile-web-viewport', async () => {
  const actual = await vi.importActual<typeof import('@/web/lib/is-mobile-web-viewport')>(
    '@/web/lib/is-mobile-web-viewport'
  );
  return {
    ...actual,
    useMobileWebViewport: vi.fn(() => false),
  };
});

import { useApp } from '@/core/context/AppProvider';

function renderShell(initialPath = '/home', presence?: ExtensionPresence) {
  const tree = (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<WebAppShell />}>
          <Route path="/home" element={<h1>Home</h1>} />
          <Route path="/library" element={<h1>Library</h1>} />
          <Route path="/settings" element={<h1>Settings</h1>} />
          <Route path="/sign-in" element={<h1>Sign in page</h1>} />
          <Route path="/install" element={<h1>Install page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  return render(
    presence ? (
      <ExtensionPresenceProvider presenceOverride={presence}>
        {tree}
      </ExtensionPresenceProvider>
    ) : (
      tree
    )
  );
}

describe('WebAppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(EXT_NOTICE_PREFS_KEY);
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
    vi.mocked(useMobileWebViewport).mockReturnValue(false);
  });

  afterEach(() => {
    localStorage.removeItem(EXT_NOTICE_PREFS_KEY);
  });

  it('marks nav-home active on /home', () => {
    renderShell('/home');
    const navHome = document.querySelector('[data-od-id="nav-home"]');
    expect(navHome).toBeTruthy();
    expect(navHome?.classList.contains('active')).toBe(true);
  });

  it('toggles sidebar-collapsed on app-shell via collapse control', () => {
    renderShell('/home');
    const shell = document.querySelector('[data-od-id="app-shell"]');
    expect(shell).toBeTruthy();
    expect(shell?.classList.contains('sidebar-collapsed')).toBe(false);

    const collapse = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapse);
    expect(shell?.classList.contains('sidebar-collapsed')).toBe(true);

    fireEvent.click(collapse);
    expect(shell?.classList.contains('sidebar-collapsed')).toBe(false);
  });

  it('does not render the product topbar', () => {
    renderShell('/home');
    expect(document.querySelector('[data-od-id="topbar"]')).toBeNull();
    expect(document.querySelector('[data-od-id="top-cta"]')).toBeNull();
    expect(document.querySelector('[data-od-id="mode-badge"]')).toBeNull();
  });

  it('sets workspace is-flush on /library, not on /home', () => {
    const lib = renderShell('/library');
    expect(
      document.querySelector('[data-od-id="workspace"]')?.classList.contains('is-flush')
    ).toBe(true);
    lib.unmount();

    renderShell('/home');
    expect(
      document.querySelector('[data-od-id="workspace"]')?.classList.contains('is-flush')
    ).toBe(false);
  });

  it('unknown presence does not show install chrome', () => {
    renderShell('/home', 'unknown');
    expect(document.querySelector('[data-od-id="ext-notice"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ext-notice-remnant"]')).toBeNull();
  });

  it('guest + missing shows shell strip; hide collapses to remnant', () => {
    renderShell('/home', 'missing');
    const strip = document.querySelector('[data-od-id="ext-notice"]');
    expect(strip).toBeTruthy();
    expect(strip?.getAttribute('data-kind')).toBe('missing-strip');
    expect(document.querySelector('[data-od-id="ext-notice-install"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ext-notice-signin"]')).toBeTruthy();

    fireEvent.click(document.querySelector('[data-od-id="ext-notice-hide"]')!);
    expect(document.querySelector('[data-od-id="ext-notice"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ext-notice-remnant"]')).toBeTruthy();
  });

  it('hiding the missing-extension strip survives remount as remnant', () => {
    const first = renderShell('/home', 'missing');
    fireEvent.click(document.querySelector('[data-od-id="ext-notice-hide"]')!);
    first.unmount();

    renderShell('/home', 'missing');
    expect(document.querySelector('[data-od-id="ext-notice"]')).toBeNull();
    const remnant = document.querySelector(
      '[data-od-id="ext-notice-remnant"]'
    ) as HTMLAnchorElement | null;
    expect(remnant).toBeTruthy();
    expect(remnant?.getAttribute('href')).toBe('/install');
  });

  it('guest with extension installed sees sign-in notice; hide leaves no remnant', () => {
    renderShell('/home', 'installed');
    const strip = document.querySelector('[data-od-id="ext-notice"]');
    expect(strip?.getAttribute('data-kind')).toBe('guest-signin');
    expect(strip?.textContent).toMatch(/Guest captures stay in the extension/i);
    expect(document.querySelector('[data-od-id="ext-notice-signin"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ext-notice-install"]')).toBeNull();
    expect(document.querySelector('[data-od-id="guest-banner"]')).toBeNull();

    fireEvent.click(document.querySelector('[data-od-id="ext-notice-hide"]')!);
    expect(document.querySelector('[data-od-id="ext-notice"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ext-notice-remnant"]')).toBeNull();
  });

  it('missing-extension strip appears on settings as well as home', () => {
    renderShell('/settings', 'missing');
    expect(document.querySelector('[data-od-id="ext-notice"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ext-notice-install"]')).toBeTruthy();
  });

  it('mobile viewport hides extension notice strip even when extension missing', () => {
    vi.mocked(useMobileWebViewport).mockReturnValue(true);
    renderShell('/home', 'missing');
    expect(document.querySelector('[data-od-id="ext-notice"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ext-notice-remnant"]')).toBeNull();
  });

  it('signed-in on mobile with extension missing shows no install chrome', () => {
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      user: { email: 'a@b.co', displayName: 'Ada' },
    });
    vi.mocked(useMobileWebViewport).mockReturnValue(true);
    renderShell('/home', 'missing');
    expect(document.querySelector('[data-od-id="ext-notice"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ext-notice-remnant"]')).toBeNull();
  });

  it('signed-in + missing strip has no sign-in control', () => {
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      user: { email: 'a@b.co', displayName: 'Ada' },
    });
    renderShell('/library', 'missing');
    expect(document.querySelector('[data-od-id="ext-notice"]')?.textContent).toMatch(
      /Highlighting lives in the extension/i
    );
    expect(document.querySelector('[data-od-id="ext-notice-signin"]')).toBeNull();
  });

  it('renders theme toggle in footer and toggles theme on click', () => {
    const setThemeMock = vi.fn();
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      user: null,
      theme: 'light',
      setTheme: setThemeMock,
    });

    renderShell('/home');
    const themeBtn = document.querySelector('[data-od-id="theme-toggle"]');
    expect(themeBtn).toBeTruthy();
    expect(themeBtn?.getAttribute('aria-label')).toBe('Switch to dark theme');

    fireEvent.click(themeBtn!);
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('renders settings link with data-od-id nav-settings', () => {
    renderShell('/home');
    const navSettings = document.querySelector('[data-od-id="nav-settings"]');
    expect(navSettings).toBeTruthy();
    expect(navSettings?.getAttribute('href')).toBe('/settings');
  });

  it('provides title tooltips on rail items when sidebar is collapsed', () => {
    renderShell('/home');
    const collapse = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapse);

    const themeBtn = document.querySelector('[data-od-id="theme-toggle"]');
    expect(themeBtn?.getAttribute('title')).toBe('Switch to dark theme');

    const homeNav = document.querySelector('[data-od-id="nav-home"]');
    expect(homeNav?.getAttribute('title')).toBe('Home');

    const libNav = document.querySelector('[data-od-id="nav-library"]');
    expect(libNav?.getAttribute('title')).toBe('Library');

    const settingsNav = document.querySelector('[data-od-id="nav-settings"]');
    expect(settingsNav?.getAttribute('title')).toBe('Settings');
  });
});
