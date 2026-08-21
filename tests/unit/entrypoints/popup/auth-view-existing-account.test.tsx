import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { AuthView } from '@/entrypoints/popup/views/AuthView';
import { EXISTING_ACCOUNT_CODE } from '@/shared/auth/auth-error-messages';

vi.mock('@/features/auth/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/shared/auth/auth-email-ui', () => ({
  isAuthEmailUiEnabled: vi.fn(() => true),
}));

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

/**
 * Signing up with an already-registered email must steer the user to sign
 * in instead of leaving them stuck on a registration form that can never
 * succeed (see EXISTING_ACCOUNT_CODE in auth-error-messages.ts).
 */
describe('AuthView existing-account signup', () => {
  const onLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockCurrentUser(registerWithEmail: ReturnType<typeof vi.fn>) {
    vi.mocked(useCurrentUser).mockReturnValue({
      user: null,
      verificationStatus: 'idle',
      verificationExpiresAt: null,
      verificationEmail: null,
      isLoading: false,
      error: null,
      login: vi.fn(),
      loginWithEmail: vi.fn(),
      registerWithEmail,
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useCurrentUser>);
  }

  it('shows a sign-in nudge and flips to the sign-in form when the account already exists', async () => {
    const registerWithEmail = vi.fn().mockResolvedValue({
      success: false,
      error: 'An account with this email already exists. Sign in instead.',
      code: EXISTING_ACCOUNT_CODE,
    });
    mockCurrentUser(registerWithEmail);

    render(<AuthView onLoginSuccess={onLoginSuccess} />);

    // Landing defaults to create-account (matches web SignInView).
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('An account with this email already exists. Sign in instead.')).toBeInTheDocument();
    });

    // Flipped back to the sign-in form (button label reverts to "Sign in").
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('blocks submission client-side for passwords under 8 characters', async () => {
    const registerWithEmail = vi.fn();
    mockCurrentUser(registerWithEmail);

    render(<AuthView onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });
    expect(registerWithEmail).not.toHaveBeenCalled();
  });
});
