import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AuthView } from '@/entrypoints/popup/views/AuthView';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { ensureSupabaseOrigin } from '@/shared/permissions/ensure-origins';

vi.mock('@/features/auth/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/shared/auth/auth-email-ui', () => ({
  isAuthEmailUiEnabled: vi.fn(() => false),
}));

vi.mock('@/shared/permissions/ensure-origins', () => ({
  ensureSupabaseOrigin: vi.fn(),
  ORIGIN_SUPABASE: 'https://cuzwaukxagefyvtxbqmi.supabase.co/*',
}));

describe('AuthView Supabase permission gate (Google OAuth)', () => {
  const login = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    login.mockResolvedValue({ success: true });
    vi.mocked(useCurrentUser).mockReturnValue({
      user: null,
      verificationStatus: 'idle',
      verificationExpiresAt: null,
      verificationEmail: null,
      isLoading: false,
      error: null,
      login,
      loginWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useCurrentUser>);
  });

  it('requests the Supabase origin from the click gesture before login', async () => {
    vi.mocked(ensureSupabaseOrigin).mockResolvedValue(true);
    const onLoginSuccess = vi.fn();
    render(<AuthView onLoginSuccess={onLoginSuccess} />);

    fireEvent.click(screen.getByTestId('auth-continue-google'));

    await screen.findByText('Signing in...');
    expect(ensureSupabaseOrigin).toHaveBeenCalled();
    expect(login).toHaveBeenCalledWith('google');
    expect(onLoginSuccess).toHaveBeenCalled();
  });

  it('shows a grant-access error and skips login when denied', async () => {
    vi.mocked(ensureSupabaseOrigin).mockResolvedValue(false);
    render(<AuthView onLoginSuccess={vi.fn()} />);

    fireEvent.click(screen.getByTestId('auth-continue-google'));

    await screen.findByRole('alert');
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/grant access/i);
  });
});
