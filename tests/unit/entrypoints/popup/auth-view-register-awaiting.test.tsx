import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { AuthView } from '@/entrypoints/popup/views/AuthView';

vi.mock('@/features/auth/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

/**
 * Regression coverage for the "verify page flashes then goes to Collections"
 * bug: registering with an account that requires email confirmation must not
 * call onLoginSuccess, even though registerWithEmail() resolved successfully.
 */
describe('AuthView register-without-onLoginSuccess', () => {
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

  it('does not call onLoginSuccess when registration requires email confirmation', async () => {
    const registerWithEmail = vi.fn().mockResolvedValue({ success: true, verificationStatus: 'awaiting' });
    mockCurrentUser(registerWithEmail);

    render(<AuthView onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(registerWithEmail).toHaveBeenCalledWith('new@example.com', 'password123');
    });

    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('calls onLoginSuccess when registration completes with an active session', async () => {
    const registerWithEmail = vi.fn().mockResolvedValue({ success: true, verificationStatus: 'idle' });
    mockCurrentUser(registerWithEmail);

    render(<AuthView onLoginSuccess={onLoginSuccess} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });
});
