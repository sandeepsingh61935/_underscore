import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AuthView } from '@/entrypoints/popup/views/AuthView';
import { isAuthEmailUiEnabled } from '@/shared/auth/auth-email-ui';

vi.mock('@/features/auth/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/shared/auth/auth-email-ui', () => ({
  isAuthEmailUiEnabled: vi.fn(() => false),
}));

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

describe('AuthView Google-only default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAuthEmailUiEnabled).mockReturnValue(false);
    vi.mocked(useCurrentUser).mockReturnValue({
      user: null,
      verificationStatus: 'idle',
      verificationExpiresAt: null,
      verificationEmail: null,
      isLoading: false,
      error: null,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useCurrentUser>);
  });

  it('shows Google CTA and hides email form', () => {
    render(<AuthView onLoginSuccess={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByTestId('auth-continue-google')).toBeTruthy();
    expect(screen.queryByTestId('auth-email-form')).toBeNull();
    expect(screen.queryByText('or email')).toBeNull();
    expect(screen.queryByLabelText('Email')).toBeNull();
  });

  it('shows email form when flag is on', () => {
    vi.mocked(isAuthEmailUiEnabled).mockReturnValue(true);
    render(<AuthView onLoginSuccess={vi.fn()} />);
    expect(screen.getByTestId('auth-email-form')).toBeTruthy();
    expect(screen.getByText('or email')).toBeTruthy();
  });
});
