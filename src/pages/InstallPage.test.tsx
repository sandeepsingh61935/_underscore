import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => ({ isAuthenticated: false }),
}));

vi.mock('@/shared/extension/extension-presence', async () => {
  const actual = (await vi.importActual('@/shared/extension/extension-presence')) as Record<string, unknown>;
  return {
    ...actual,
    pingExtensionPresence: vi.fn(async () => ({ presence: 'missing' as const })),
  };
});

import { InstallPage } from './InstallPage';

function renderInstall(initial = '/install') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/install" element={<InstallPage />} />
        <Route path="/" element={<div data-od-id="welcome-stub">Welcome</div>} />
        <Route path="/home" element={<div data-od-id="home-stub">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('InstallPage alias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome-gate alias (data-od-id=install data-alias=welcome-gate, gate open)', () => {
    renderInstall();
    const root = document.querySelector('[data-od-id="install"]');
    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-alias')).toBe('welcome-gate');
    expect(root?.getAttribute('data-gate')).toBe('open');
    expect(document.querySelector('[data-od-id="welcome-gate-panel"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-browsers"]')).toBeTruthy();
  });

  it('alias shows browser cards (at least one store CTA) and verify block', () => {
    renderInstall();
    const chrome = document.querySelector('[data-od-id="welcome-gate-browser-chrome"]');
    const firefox = document.querySelector('[data-od-id="welcome-gate-browser-firefox"]');
    expect(chrome || firefox).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-check"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="welcome-gate-how"]')).toBeTruthy();
  });

  it('alias has no separate install layout', () => {
    renderInstall();
    expect(document.querySelector('[data-od-id="install-lede"]')).toBeNull();
    expect(document.querySelector('.install__panel')).toBeNull();
  });
});
