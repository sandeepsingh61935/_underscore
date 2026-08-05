import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

import { useApp } from '@/core/context/AppProvider';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
  });

  it('guest: Local only kicker, local library title, true empty (no seed quotes)', () => {
    renderHome();

    const root = document.querySelector('[data-od-id="home"]');
    expect(root).toBeTruthy();

    const kicker = document.querySelector('[data-od-id="home-kicker"]');
    expect(kicker).toBeTruthy();
    expect(kicker?.textContent?.trim()).toBe('Local only');

    const title = document.querySelector('[data-od-id="home-title"]');
    expect(title).toBeTruthy();
    expect(title?.textContent?.trim()).toBe('Your local library');

    expect(document.querySelector('[data-od-id="guest-banner"]')).toBeTruthy();

    const stats = document.querySelector('[data-od-id="home-stats"]');
    expect(stats).toBeTruthy();
    expect(document.querySelector('[data-od-id="stat-highlights"] .stat-val')?.textContent).toBe(
      '0',
    );
    expect(document.querySelector('[data-od-id="stat-pages"] .stat-val')?.textContent).toBe('0');
    expect(document.querySelector('[data-od-id="stat-week"] .stat-val')?.textContent).toBe('0');
    expect(
      document.querySelector('[data-od-id="stat-plan"] .stat-val')?.textContent?.trim(),
    ).toBe('Guest');

    // True empty: no highlight cards / seed quotes
    expect(document.querySelectorAll('.hl-quote').length).toBe(0);
    expect(document.querySelector('[data-od-id="home-current-page"]')).toBeNull();
    expect(document.querySelector('[data-od-id="home-cta"]')).toBeNull();
    expect(document.querySelector('[data-od-id="home-ask-page"]')).toBeNull();

    expect(screen.getByText('Nothing saved')).toBeTruthy();
    expect(screen.getByText(/Select text in the extension/i)).toBeTruthy();
    expect(screen.getByText('No page open')).toBeTruthy();
  });
});
