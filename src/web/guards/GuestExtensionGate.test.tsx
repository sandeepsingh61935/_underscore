import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

import { GuestExtensionGate } from './GuestExtensionGate';

const useAppMock = vi.fn();

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => useAppMock(),
}));

function renderGate(
  opts: {
    auth?: boolean;
    presenceOverride?: 'installed' | 'missing' | 'unknown';
    initial?: string;
  } = {},
) {
  useAppMock.mockReturnValue({ isAuthenticated: opts.auth ?? false });
  return render(
    <MemoryRouter initialEntries={[opts.initial ?? '/home']}>
      <Routes>
        <Route
          element={
            <GuestExtensionGate presenceOverride={opts.presenceOverride} />
          }
        >
          <Route path="/home" element={<div data-od-id="home-ok">Home</div>} />
          <Route path="/library" element={<div data-od-id="lib-ok">Lib</div>} />
          <Route path="/settings" element={<div data-od-id="set-ok">Set</div>} />
        </Route>
        <Route path="/install" element={<div data-od-id="install-ok">Install</div>} />
        <Route path="/privacy" element={<div data-od-id="privacy-ok">Privacy</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GuestExtensionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guest + missing → redirect /install', async () => {
    renderGate({ auth: false, presenceOverride: 'missing', initial: '/home' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="install-ok"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="home-ok"]')).toBeNull();
  });

  it('guest + installed → product renders', async () => {
    renderGate({ auth: false, presenceOverride: 'installed', initial: '/library' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="lib-ok"]')).toBeTruthy();
    });
  });

  it('signed-in + missing presence still allows product', async () => {
    renderGate({ auth: true, presenceOverride: 'missing', initial: '/home' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="home-ok"]')).toBeTruthy();
    });
  });

  it('signed-in + missing → product still renders', async () => {
    renderGate({ auth: true, presenceOverride: 'missing', initial: '/home' });
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="home-ok"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="install-ok"]')).toBeNull();
  });
});
