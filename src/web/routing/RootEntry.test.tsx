import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { RootEntry } from './RootEntry';

const useWebAuthMock = vi.fn();

vi.mock('@/features/auth/providers/WebAuthProvider', () => ({
  useWebAuth: () => useWebAuthMock(),
}));

vi.mock('@/pages/WelcomePage', () => ({
  WelcomePage: () => (
    <div data-od-id="welcome-marketing">
      <button type="button">Get Started</button>
    </div>
  ),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<RootEntry />} />
        <Route path="/home" element={<div data-od-id="home-page">Home</div>} />
        <Route path="/library" element={<div data-od-id="library-page">Library</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RootEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loading: shows neutral boot, not Get Started', () => {
    useWebAuthMock.mockReturnValue({ status: 'loading' });
    renderAt('/');
    expect(document.querySelector('[data-od-id="auth-boot"]')).toBeTruthy();
    expect(screen.queryByText('Get Started')).toBeNull();
    expect(document.querySelector('[data-od-id="welcome-marketing"]')).toBeNull();
  });

  it('authenticated: navigates to /home without Welcome', () => {
    useWebAuthMock.mockReturnValue({ status: 'authenticated' });
    renderAt('/');
    expect(document.querySelector('[data-od-id="home-page"]')).toBeTruthy();
    expect(screen.queryByText('Get Started')).toBeNull();
  });

  it('authenticated with safe returnTo goes there', () => {
    useWebAuthMock.mockReturnValue({ status: 'authenticated' });
    renderAt('/?returnTo=/library');
    expect(document.querySelector('[data-od-id="library-page"]')).toBeTruthy();
  });

  it('unauthenticated: shows Welcome Get Started', () => {
    useWebAuthMock.mockReturnValue({ status: 'unauthenticated' });
    renderAt('/');
    expect(document.querySelector('[data-od-id="welcome-marketing"]')).toBeTruthy();
    expect(screen.getByText('Get Started')).toBeTruthy();
  });
});
