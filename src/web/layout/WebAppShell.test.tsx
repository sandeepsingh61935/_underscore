import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WebAppShell } from './WebAppShell';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

import { useApp } from '@/core/context/AppProvider';

function renderShell(initialPath = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<WebAppShell />}>
          <Route path="/home" element={<h1>Home</h1>} />
          <Route path="/library" element={<h1>Library</h1>} />
          <Route path="/settings" element={<h1>Settings</h1>} />
          <Route path="/sign-in" element={<h1>Sign in page</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('WebAppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
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
});
