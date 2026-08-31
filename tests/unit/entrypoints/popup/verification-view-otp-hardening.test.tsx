import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { VerificationView } from '@/entrypoints/popup/views/VerificationView';

vi.mock('@/features/auth/hooks/useAuthActions', () => ({
  useAuthActions: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useAuthActions } from '@/features/auth/hooks/useAuthActions';

/**
 * Hardening regressions:
 * 1. A wrong/expired code shows one honest message and clears the OTP boxes.
 * 2. Resend locks immediately after a successful send (60s default cooldown)
 *    instead of allowing the user to spam the backend.
 * 3. A rate-limited resend locks using the server-provided retryAfterMs.
 */
describe('VerificationView OTP hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAuthActions(overrides: Partial<ReturnType<typeof useAuthActions>> = {}) {
    vi.mocked(useAuthActions).mockReturnValue({
      verifyEmailOtp: vi.fn(),
      resendEmailOtp: vi.fn(),
      requestPasswordReset: vi.fn(),
      verifyRecoveryOtp: vi.fn(),
      updatePassword: vi.fn(),
      ...overrides,
    } as unknown as ReturnType<typeof useAuthActions>);
  }

  it('clears the OTP input and shows one honest message on verify failure', async () => {
    const verifyEmailOtp = vi.fn().mockResolvedValue({
      success: false,
      error: 'That code is incorrect or has expired. Try again or resend a new code.',
    });
    mockAuthActions({ verifyEmailOtp });

    render(
      <VerificationView
        email="user@example.com"
        expiresAt={Date.now() + 5 * 60 * 1000}
        onVerified={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const digitInputs = screen.getAllByLabelText(/Digit \d of 6/);
    '123456'.split('').forEach((digit, i) => {
      fireEvent.change(digitInputs[i]!, { target: { value: digit } });
    });

    await waitFor(() => {
      expect(verifyEmailOtp).toHaveBeenCalledWith('user@example.com', '123456');
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'That code is incorrect or has expired. Try again or resend a new code.'
        )
      ).toBeInTheDocument();
    });

    // OTP boxes are cleared after a failed attempt.
    digitInputs.forEach((input) => {
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  it('locks the resend button for 60s after a successful resend', async () => {
    const resendEmailOtp = vi.fn().mockResolvedValue({ success: true });
    mockAuthActions({ resendEmailOtp });

    render(
      <VerificationView
        email="user@example.com"
        expiresAt={Date.now() + 5 * 60 * 1000}
        onVerified={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const resendButton = screen.getByRole('button', { name: 'Resend code' });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(resendEmailOtp).toHaveBeenCalledWith('user@example.com');
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resend in \d:\d{2}/ })).toBeDisabled();
    });

    expect(screen.getByText('New code sent')).toBeInTheDocument();

    // A second click while locked must not fire another request.
    fireEvent.click(screen.getByRole('button', { name: /Resend in \d:\d{2}/ }));
    expect(resendEmailOtp).toHaveBeenCalledTimes(1);
  });

  it('locks the resend button using the server retryAfterMs on rate limit', async () => {
    const resendEmailOtp = vi.fn().mockResolvedValue({
      success: false,
      error: 'Too many attempts. Try again in 0:45.',
      code: 'RATE_LIMIT',
      retryAfterMs: 45_000,
    });
    mockAuthActions({ resendEmailOtp });

    render(
      <VerificationView
        email="user@example.com"
        expiresAt={Date.now() + 5 * 60 * 1000}
        onVerified={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));

    await waitFor(() => {
      expect(
        screen.getByText('Too many attempts. Try again in 0:45.')
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resend in 0:4\d/ })).toBeDisabled();
    });
  });
});
