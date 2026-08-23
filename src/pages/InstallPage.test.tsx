import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

import { getInstallDistributionConfig } from '@/web/install/install-distribution';

import { InstallPage } from './InstallPage';

function renderInstall(
  ui: React.ReactElement = <InstallPage detectedBrowser="chrome" />,
  initialPath = '/install',
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/install" element={ui} />
        <Route path="/home" element={<div data-od-id="home-stub">Home</div>} />
        <Route path="/" element={<div data-od-id="welcome-stub">Welcome</div>} />
        <Route path="/help" element={<div data-od-id="help-stub">Help</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InstallPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders why, status, both browsers, help, and continue', () => {
    renderInstall();
    expect(screen.getByRole('heading', { name: /Capture lives in the/i })).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-status"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-status"]')?.textContent).toMatch(
      /store listings are in progress/i,
    );
    expect(document.querySelector('[data-od-id="install-browser-chrome"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-browser-firefox"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-download-chrome"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-download-firefox"]')).toBeTruthy();
    const help = document.querySelector('[data-od-id="install-help"]') as HTMLAnchorElement;
    expect(help?.getAttribute('href')).toBe('/help#install');
    expect(screen.getByRole('button', { name: /Continue without installing/i })).toBeTruthy();
  });

  it('marks detected browser as suggested and orders it first', () => {
    renderInstall(<InstallPage detectedBrowser="firefox" />);
    const cards = [
      ...document.querySelectorAll('[data-od-id^="install-browser-"]'),
    ] as HTMLElement[];
    expect(cards[0]?.getAttribute('data-od-id')).toBe('install-browser-firefox');
    expect(cards[0]?.getAttribute('data-suggested')).toBe('true');
    expect(cards[1]?.getAttribute('data-suggested')).toBe('false');
  });

  it('continue navigates to /home', () => {
    renderInstall();
    fireEvent.click(screen.getByRole('button', { name: /Continue without installing/i }));
    expect(document.querySelector('[data-od-id="home-stub"]')).toBeTruthy();
  });

  it('manual mode does not render store CTAs', () => {
    const cfg = getInstallDistributionConfig({} as ImportMetaEnv);
    renderInstall(<InstallPage config={cfg} detectedBrowser="unknown" />);
    expect(document.querySelector('[data-od-id="install-store-chrome"]')).toBeNull();
    expect(document.querySelector('[data-od-id="install-store-firefox"]')).toBeNull();
  });

  it('shows store CTA when config includes store availability', () => {
    const cfg = getInstallDistributionConfig({
      VITE_INSTALL_DISTRIBUTION_MODE: 'hybrid',
      VITE_CHROME_STORE_URL: 'https://chrome.example/x',
    } as unknown as ImportMetaEnv);
    renderInstall(<InstallPage config={cfg} detectedBrowser="chrome" />);
    const store = document.querySelector(
      '[data-od-id="install-store-chrome"]',
    ) as HTMLAnchorElement;
    expect(store).toBeTruthy();
    expect(store.href).toContain('chrome.example');
    expect(document.querySelector('[data-od-id="install-download-chrome"]')).toBeTruthy();
  });
});
