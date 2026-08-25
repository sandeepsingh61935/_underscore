import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => ({ isAuthenticated: false }),
}));

vi.mock('@/shared/extension/extension-presence', async () => {
  const actual = await vi.importActual('@/shared/extension/extension-presence') as Record<string, unknown>;
  return {
    ...actual,
    pingExtensionPresence: vi.fn(async () => ({ presence: 'missing' as const })),
  };
});

import { WelcomePage } from './WelcomePage';
import { pingExtensionPresence } from '@/shared/extension/extension-presence';

function wrap(ui: React.ReactElement, initial = '/') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/install" element={<div data-od-id="install-stub">Install</div>} />
        <Route path="/home" element={<div data-od-id="home-stub">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WelcomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (pingExtensionPresence as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ presence: 'missing' });
  });

  it('uses welcome--web when no onStartClick (SPA)', () => {
    wrap(<WelcomePage />);
    const root = document.querySelector('[data-od-id="welcome"]');
    expect(root).toBeTruthy();
    expect(root?.classList.contains('welcome--web')).toBe(true);
    expect(root?.getAttribute('data-platform')).toBe('web');
    expect(screen.getByRole('heading', { name: /underscore/i })).toBeTruthy();
  });

  it('uses welcome--popup when onStartClick is provided', () => {
    wrap(<WelcomePage onStartClick={() => undefined} />);
    const root = document.querySelector('[data-od-id="welcome"]');
    expect(root?.classList.contains('welcome--popup')).toBe(true);
    expect(document.querySelector('[data-od-id="welcome-already-setup"]')).toBeNull();
  });

  it('Get started slides gate (no route change, data-gate=open)', async () => {
    wrap(<WelcomePage />);
    const btn = screen.getByRole('button', { name: /Get started/i });
    fireEvent.click(btn);
    const gate = document.querySelector('[data-gate="open"]');
    expect(gate).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-panel"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-stub"]')).toBeNull();
    // focus moves to first store CTA
    await waitFor(() => {
      const firstCta = document.querySelector('[data-od-id="welcome-gate-store-chrome"], [data-od-id="welcome-gate-store-firefox"]') as HTMLElement;
      expect(document.activeElement).toBe(firstCta);
    });
  });

  it('Esc reverses gate and returns focus to Get started', async () => {
    wrap(<WelcomePage />);
    fireEvent.click(screen.getByRole('button', { name: /Get started/i }));
    expect(document.querySelector('[data-gate="open"]')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(document.querySelector('[data-gate="open"]')).toBeNull();
      expect(document.querySelector('[data-od-id="welcome-get-started"]')).toBeTruthy();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(document.querySelector('[data-od-id="welcome-get-started"]'));
    });
  });

  it('Chrome UA shows only Chrome card', () => {
    wrap(<WelcomePage detectedBrowser="chrome" initialGateOpen />);
    expect(document.querySelector('[data-od-id="welcome-gate-browser-chrome"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-browser-firefox"]')).toBeNull();
    expect(document.querySelector('[data-od-id="welcome-gate-callout"]')).toBeNull();
    expect(document.querySelector('[data-od-id="welcome-gate-store-chrome"]')).toBeTruthy();
  });

  it('Firefox UA shows only Firefox card', () => {
    wrap(<WelcomePage detectedBrowser="firefox" initialGateOpen />);
    expect(document.querySelector('[data-od-id="welcome-gate-browser-firefox"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-browser-chrome"]')).toBeNull();
    expect(document.querySelector('[data-od-id="welcome-gate-callout"]')).toBeNull();
  });

  it('unknown shows both cards + callout', () => {
    wrap(<WelcomePage detectedBrowser="unknown" initialGateOpen />);
    expect(document.querySelector('[data-od-id="welcome-gate-browser-chrome"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-browser-firefox"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-callout"]')?.textContent).toMatch(/Desktop Chrome or Firefox required/i);
  });

  it('Already set up opens gate when extension missing', async () => {
    wrap(<WelcomePage />);
    const link = document.querySelector('[data-od-id="welcome-already-setup"]') as HTMLElement;
    expect(link).toBeTruthy();
    fireEvent.click(link);
    await waitFor(() => {
      expect(document.querySelector('[data-gate="open"]')).toBeTruthy();
    });
  });

  it('Already set up navigates to /home when extension installed', async () => {
    (pingExtensionPresence as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ presence: 'installed', version: '0.1.1' } as never);
    wrap(<WelcomePage />);
    const link = document.querySelector('[data-od-id="welcome-already-setup"]') as HTMLElement;
    fireEvent.click(link);
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="home-stub"]')).toBeTruthy();
    });
  });

  it('How to set it up collapsed by default and expands', async () => {
    wrap(<WelcomePage detectedBrowser="chrome" initialGateOpen />);
    expect(document.querySelector('[data-od-id="welcome-gate-how-body"]')).toBeNull();
    const toggle = document.querySelector('[data-od-id="welcome-gate-how-toggle"]') as HTMLElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(document.querySelector('[data-od-id="welcome-gate-how-body"]')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('[data-od-id="welcome-gate-how-body"]')?.textContent).toMatch(/Pin via puzzle/i);
  });

  it('I’ve installed it — check shows checking, disables, error alert on missing', async () => {
    wrap(<WelcomePage detectedBrowser="chrome" initialGateOpen />);
    const btn = document.querySelector('[data-od-id="welcome-gate-check"]') as HTMLButtonElement;
    expect(btn.textContent).toMatch(/I’ve installed it — check/i);
    fireEvent.click(btn);
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/Checking/i);
    expect(btn.classList.contains('is-loading')).toBe(true);
    await waitFor(() => {
      const err = document.querySelector('[data-od-id="welcome-gate-check-error"]');
      expect(err).toBeTruthy();
      expect(err?.getAttribute('role')).toBe('alert');
      expect(err?.textContent).toMatch(/We couldn’t find the extension/i);
    });
    expect((document.querySelector('[data-od-id="welcome-gate-check"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('check success shows Extension detected and focuses Open library', async () => {
    (pingExtensionPresence as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ presence: 'installed', version: '1.2.3' } as never);
    wrap(<WelcomePage detectedBrowser="chrome" initialGateOpen />);
    fireEvent.click(document.querySelector('[data-od-id="welcome-gate-check"]') as HTMLElement);
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="welcome-gate-success"]')?.textContent).toMatch(/Extension detected — ready/i);
      expect(document.querySelector('[data-od-id="welcome-gate-open-library"]')).toBeTruthy();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(document.querySelector('[data-od-id="welcome-gate-open-library"]'));
    });
    // no auto-redirect
    expect(document.querySelector('[data-od-id="home-stub"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-od-id="welcome-gate-open-library"]') as HTMLElement);
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="home-stub"]')).toBeTruthy();
    });
  });

  it('has no Back button (removed per design)', async () => {
    wrap(<WelcomePage detectedBrowser="chrome" initialGateOpen />);
    expect(document.querySelector('[data-action="welcome-close-gate"]')).toBeNull();
    expect(document.querySelector('.welcome__gate-back')).toBeNull();
  });
});
