import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { AuthPageEntry } from './AuthPageEntry';

const useWebAuthMock = vi.fn();

vi.mock('@/features/auth/providers/WebAuthProvider', () => ({
  useWebAuth: () => useWebAuthMock(),
}));

function renderSignIn(path = '/sign-in') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/sign-in"
          element={
            <AuthPageEntry>
              <div data-od-id="sign-in-form">Sign in form</div>
            </AuthPageEntry>
          }
        />
        <Route path="/home" element={<div data-od-id="home-page">Home</div>} />
        <Route path="/library" element={<div data-od-id="library-page">Library</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthPageEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loading: boot shell, no form', () => {
    useWebAuthMock.mockReturnValue({ status: 'loading' });
    renderSignIn();
    expect(document.querySelector('[data-od-id="auth-boot"]')).toBeTruthy();
    expect(screen.queryByText('Sign in form')).toBeNull();
  });

  it('authenticated: redirects to home', () => {
    useWebAuthMock.mockReturnValue({ status: 'authenticated' });
    renderSignIn();
    expect(document.querySelector('[data-od-id="home-page"]')).toBeTruthy();
  });

  it('authenticated with returnTo: redirects there', () => {
    useWebAuthMock.mockReturnValue({ status: 'authenticated' });
    renderSignIn('/sign-in?returnTo=/library');
    expect(document.querySelector('[data-od-id="library-page"]')).toBeTruthy();
  });

  it('unauthenticated: shows children', () => {
    useWebAuthMock.mockReturnValue({ status: 'unauthenticated' });
    renderSignIn();
    expect(document.querySelector('[data-od-id="sign-in-form"]')).toBeTruthy();
  });
});
