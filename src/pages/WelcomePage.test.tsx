import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => ({ isAuthenticated: false }),
}));

import { WelcomePage } from './WelcomePage';

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
  });

  it('uses welcome--web when no onStartClick (SPA)', () => {
    wrap(<WelcomePage />);
    const root = document.querySelector('[data-od-id="welcome"]');
    expect(root).toBeTruthy();
    expect(root?.classList.contains('welcome--web')).toBe(true);
    expect(root?.classList.contains('welcome--popup')).toBe(false);
    expect(root?.getAttribute('data-platform')).toBe('web');
    expect(screen.getByRole('heading', { name: /underscore/i })).toBeTruthy();
  });

  it('uses welcome--popup when onStartClick is provided', () => {
    wrap(<WelcomePage onStartClick={() => undefined} />);
    const root = document.querySelector('[data-od-id="welcome"]');
    expect(root?.classList.contains('welcome--popup')).toBe(true);
    expect(root?.classList.contains('welcome--web')).toBe(false);
    expect(root?.getAttribute('data-platform')).toBe('popup');
    expect(document.querySelector('[data-od-id="welcome-already-setup"]')).toBeNull();
  });

  it('web Get started navigates to /install', () => {
    wrap(<WelcomePage />);
    fireEvent.click(screen.getByRole('button', { name: /Get started/i }));
    expect(document.querySelector('[data-od-id="install-stub"]')).toBeTruthy();
  });

  it('web shows Already set up link to /home', () => {
    wrap(<WelcomePage />);
    const link = document.querySelector(
      '[data-od-id="welcome-already-setup"]',
    ) as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/home');
  });

  it('popup Get started calls onStartClick and does not route to /install', () => {
    const onStart = vi.fn();
    wrap(<WelcomePage onStartClick={onStart} />);
    fireEvent.click(screen.getByRole('button', { name: /Get started/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-od-id="install-stub"]')).toBeNull();
  });
});
