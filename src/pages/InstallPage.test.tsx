import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

import { getInstallDistributionConfig } from '@/web/install/install-distribution';

import { InstallPage } from './InstallPage';

function renderInstall(ui: React.ReactElement = <InstallPage detectedBrowser="chrome" />) {
  return render(
    <MemoryRouter initialEntries={['/install']}>
      <Routes>
        <Route path="/install" element={ui} />
        <Route path="/help" element={<div data-od-id="help-stub">Help</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InstallPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('chrome UA: only Chrome download; no Continue', () => {
    renderInstall(<InstallPage detectedBrowser="chrome" />);
    expect(screen.getByRole('heading', { name: /Install the extension/i })).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-status"]')).toBeNull();
    expect(document.querySelector('[data-od-id="install-download-chrome"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-download-firefox"]')).toBeNull();
    expect(document.querySelector('[data-od-id="install-browser-firefox"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /Continue without installing/i })).toBeNull();
    expect(document.querySelector('[data-od-id="install-wrong-browser"]')).toBeTruthy();
  });

  it('firefox UA: only Firefox download', () => {
    renderInstall(<InstallPage detectedBrowser="firefox" />);
    expect(document.querySelector('[data-od-id="install-download-firefox"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-download-chrome"]')).toBeNull();
  });

  it('unknown UA: both downloads, no wrong-browser toggle', () => {
    renderInstall(<InstallPage detectedBrowser="unknown" />);
    expect(document.querySelector('[data-od-id="install-download-chrome"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-download-firefox"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-wrong-browser"]')).toBeNull();
  });

  it('Wrong browser? reveals the other package', () => {
    renderInstall(<InstallPage detectedBrowser="chrome" />);
    fireEvent.click(screen.getByRole('button', { name: /Wrong browser/i }));
    expect(document.querySelector('[data-od-id="install-download-firefox"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="install-download-chrome"]')).toBeTruthy();
  });

  it('help link targets /help#install', () => {
    renderInstall();
    const help = document.querySelector('[data-od-id="install-help"]') as HTMLAnchorElement;
    expect(help?.getAttribute('href')).toBe('/help#install');
  });

  it('manual mode has no store CTAs', () => {
    const cfg = getInstallDistributionConfig({} as ImportMetaEnv);
    renderInstall(<InstallPage config={cfg} detectedBrowser="chrome" />);
    expect(document.querySelector('[data-od-id="install-store-chrome"]')).toBeNull();
  });
});
