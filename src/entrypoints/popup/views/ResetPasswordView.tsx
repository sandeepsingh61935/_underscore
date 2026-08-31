import React, { useEffect, useState } from 'react';

import { useAuthActions } from '../../../features/auth/hooks/useAuthActions';
import { useResendCooldown } from '../../../features/auth/hooks/useResendCooldown';
import { DevEmailHint } from '../../../ui-system/components/composed/DevEmailHint';
import { OtpInput } from '../../../ui-system/components/composed/OtpInput';

import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { isRateLimitCode } from '@/shared/auth/auth-error-messages';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';

interface ResetPasswordViewProps {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}

/**
 * ResetPasswordView — enter the 6-digit reset code + a new password.
 *
 * Body-only root: `display: flex, flex-direction: column, height: 100%, width: 100%`.
 * PopupShell owns the 400x600 chrome; this view returns body content only.
 */
export function ResetPasswordView({
  email,
  onSuccess,
  onBack,
}: ResetPasswordViewProps): React.ReactElement {
  const { verifyRecoveryOtp, updatePassword, requestPasswordReset } = useAuthActions();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending'>('idle');
  const [showSentNotice, setShowSentNotice] = useState(false);
  const resendCooldown = useResendCooldown();

  useEffect(() => {
    if (!resendCooldown.isLocked) {
      setShowSentNotice(false);
    }
  }, [resendCooldown.isLocked]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const verifyResult = await verifyRecoveryOtp(email, code);
    if (!verifyResult.success) {
      setIsSubmitting(false);
      setError(
        verifyResult.error ||
          'That code is incorrect or has expired. Try again or resend a new code.'
      );
      setCode('');
      return;
    }

    const updateResult = await updatePassword(password);
    setIsSubmitting(false);
    if (!updateResult.success) {
      setError(updateResult.error || 'Failed to update password. Please try again.');
      return;
    }

    onSuccess();
  };

  const handleResend = async (): Promise<void> => {
    setError(null);
    if (resendCooldown.isLocked || resendState === 'sending') return;

    setResendState('sending');
    const result = await requestPasswordReset(email);
    setResendState('idle');

    if (result.success) {
      resendCooldown.start();
      setShowSentNotice(true);
      return;
    }

    setShowSentNotice(false);
    if (isRateLimitCode(result.code)) {
      resendCooldown.start(result.retryAfterMs);
    }
    setError(result.error || 'Failed to resend code. Please try again.');
  };

  const showPasswordHelper = password.length < 8;

  return (
    <AuthScreenShell
      variant="popup"
      kicker="Reset password"
      title="Enter your reset code"
      subtitle={
        <>
          We sent a 6-digit code to{' '}
          <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{email}</span>
        </>
      }
      error={error}
      footer={
        <>
          <p
            className="u-sans"
            style={{
              fontSize: 'var(--step--1)',
              color: 'var(--ink-3)',
              textAlign: 'center',
              margin: '0 0 8px',
            }}
          >
            Didn&apos;t get a code?{' '}
            <Button
              type="button"
              variant="ghost"
              onClick={() => void handleResend()}
              disabled={resendState === 'sending' || resendCooldown.isLocked}
              style={{ padding: '0 8px', fontWeight: 500, textDecoration: 'underline' }}
            >
              {resendState === 'sending'
                ? 'Sending...'
                : resendCooldown.isLocked
                  ? `Resend in ${resendCooldown.formatted}`
                  : 'Resend code'}
            </Button>
          </p>

          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            style={{ display: 'flex', margin: '0 auto' }}
          >
            Back to sign in
          </Button>
        </>
      }
    >
      <DevEmailHint />

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <OtpInput
          length={6}
          value={code}
          onChange={setCode}
          disabled={isSubmitting}
          autoFocus
          error={Boolean(error)}
        />
      </div>

      {showSentNotice ? (
        <p
          className="u-sans"
          style={{
            textAlign: 'center',
            fontSize: 'var(--step--1)',
            color: 'var(--ink-3)',
            margin: '0 0 16px',
          }}
        >
          New code sent
        </p>
      ) : null}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor="popup-reset-password"
            className="u-kicker"
            style={{ color: 'var(--ink-3)' }}
          >
            New password
          </label>
          <Input
            id="popup-reset-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            autoComplete="new-password"
          />
          {showPasswordHelper ? (
            <p
              className="u-sans"
              style={{ margin: 0, fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}
            >
              At least 8 characters
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor="popup-reset-confirm"
            className="u-kicker"
            style={{ color: 'var(--ink-3)' }}
          >
            Confirm password
          </label>
          <Input
            id="popup-reset-confirm"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSubmitting}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={code.length !== 6 || !password || !confirmPassword}
          style={{ width: '100%' }}
        >
          Reset password
        </Button>
      </form>
    </AuthScreenShell>
  );
}
