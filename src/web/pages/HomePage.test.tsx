import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage, libraryHref } from './HomePage';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

vi.mock('@/web/lib/is-mobile-web-viewport', () => ({
  useMobileWebViewport: vi.fn(() => false),
}));

import { useApp } from '@/core/context/AppProvider';
import { useMobileWebViewport } from '@/web/lib/is-mobile-web-viewport';
import { clearWebLibrarySessionMemory } from '@/web/hooks/useWebLibrary';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWebLibrarySessionMemory();
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
  });

  it('guest: Local Library title, true empty (no seed quotes or stats)', () => {
    renderHome();

    const root = document.querySelector('[data-od-id="home"]');
    expect(root).toBeTruthy();

    const title = document.querySelector('[data-od-id="home-title"]');
    expect(title).toBeTruthy();
    expect(title?.textContent?.trim()).toBe('Local Library');

    expect(document.querySelector('[data-od-id="guest-banner"]')).toBeNull();

    // OD: stats-groups only when library has rows
    expect(document.querySelector('[data-od-id="home-stats"]')).toBeNull();

    // True empty: no highlight cards / seed quotes
    expect(document.querySelectorAll('.hl-quote').length).toBe(0);
    expect(document.querySelector('[data-od-id="home-current-page"]')).toBeNull();
    expect(document.querySelector('[data-od-id="home-cta"]')).toBeNull();
    expect(document.querySelector('[data-od-id="home-ask-page"]')).toBeNull();

    expect(screen.getByText('No highlights yet')).toBeTruthy();
    // Without presence provider, extensionInstalled is false → install CTA
    expect(document.querySelector('[data-od-id="home-empty-install"]')).toBeTruthy();
    expect(screen.getByText(/Install the extension/i)).toBeTruthy();
    expect(screen.getByText('No page open')).toBeTruthy();
  });

  it('libraryHref: root path omits section; nested path sets section', () => {
    expect(libraryHref('example.com', '/')).toBe('/library?domain=example.com');
    expect(libraryHref('example.com', null)).toBe('/library?domain=example.com');
    expect(libraryHref('example.com', '/docs/guide')).toBe(
      '/library?domain=example.com&section=%2Fdocs%2Fguide'
    );
  });

  it('does not violate rules of hooks when transitioning from loading to ready', async () => {
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: true,
      user: { email: 'user@example.com' },
    });
    renderHome();
    await screen.findByText(/Good/);
    const hookOrderErrors = (console.error as any).mock.calls.filter((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('Rules of Hooks')
    );
    expect(hookOrderErrors).toHaveLength(0);
  });

  it('does not violate rules of hooks when viewport transitions between mobile and desktop', () => {
    vi.mocked(useMobileWebViewport).mockReturnValue(true);
    const { rerender } = renderHome();
    expect(document.querySelector('[data-od-id="phone-home"]')).toBeTruthy();

    vi.mocked(useMobileWebViewport).mockReturnValue(false);
    rerender(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const hookOrderErrors = (console.error as any).mock.calls.filter((call: any[]) =>
      typeof call[0] === 'string' && call[0].includes('Rules of Hooks')
    );
    expect(hookOrderErrors).toHaveLength(0);
  });
});
