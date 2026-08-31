import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useAuthActions } from '../../../features/auth/hooks/useAuthActions';
import { useResendCooldown } from '../../../features/auth/hooks/useResendCooldown';
import { DevEmailHint } from '../../../ui-system/components/composed/DevEmailHint';
import { OtpInput } from '../../../ui-system/components/composed/OtpInput';

import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { isRateLimitCode } from '@/shared/auth/auth-error-messages';
import { Button } from '@/ui-system/components/primitives/Button';

interface VerificationViewProps {
  email: string;
  expiresAt: number | null;
  onVerified: () => void;
  onCancel: () => void;
}

/**
 * VerificationView — 6-digit email OTP confirmation screen.
 *
 * Body-only root: `display: flex, flex-direction: column, height: 100%, width: 100%`.
 * PopupShell owns the 400x600 chrome; this view returns body content only.
 */
export function VerificationView({
  email,
  expiresAt,
  onVerified,
  onCancel,
}: VerificationViewProps): React.ReactElement {
  const { verifyEmailOtp, resendEmailOtp } = useAuthActions();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [showSentNotice, setShowSentNotice] = useState(false);
  const resendCooldown = useResendCooldown();

  useEffect(() => {
    if (!resendCooldown.isLocked) {
      setShowSentNotice(false);
    }
  }, [resendCooldown.isLocked]);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = (): void => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeLeft(remaining);

      if (remaining === 0) {
        setIsExpired(true);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (submitted?: string): Promise<void> => {
    const value = submitted ?? code;
    if (value.length !== 6 || isVerifying) return;

    setError(null);
    setIsVerifying(true);
    const result = await verifyEmailOtp(email, value);
    setIsVerifying(false);

    if (result.success) {
      onVerified();
    } else {
      setError(
        result.error ||
          'That code is incorrect or has expired. Try again or resend a new code.'
      );
      setCode('');
    }
  };

  const handleResend = async (): Promise<void> => {
    setError(null);

    if (!email) {
      setError('A valid email is required. Go back and start again.');
      return;
    }

    if (resendCooldown.isLocked || resendState === 'sending') return;

    setResendState('sending');
    const result = await resendEmailOtp(email);
    setResendState('idle');
    setIsExpired(false);

    if (result.success) {
      resendCooldown.start();
      setShowSentNotice(true);
      toast.success('Code sent — check your inbox');
      return;
    }

    setShowSentNotice(false);
    if (isRateLimitCode(result.code)) {
      resendCooldown.start(result.retryAfterMs);
    }
    setError(result.error || 'Failed to resend code. Please try again.');
  };

  return (
    <AuthScreenShell
      variant="popup"
      kicker="Confirm email"
      title="Check your email"
      subtitle={
        <>
          Enter the 6-digit code we sent to{' '}
          <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{email}</span>.
        </>
      }
      error={error}
    >
      <DevEmailHint />

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <OtpInput
          length={6}
          value={code}
          onChange={setCode}
          onComplete={(value) => {
            void handleVerify(value);
          }}
          disabled={isVerifying || isExpired}
          autoFocus
          error={Boolean(error)}
        />
      </div>

      {!isExpired ? (
        <div
          className="u-mono"
          style={{
            color: 'var(--ink-3)',
            fontSize: 'var(--step--2)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Code expires in {formatTime(timeLeft)}
        </div>
      ) : (
        <div
          className="u-sans"
          style={{
            color: 'var(--ink)',
            fontSize: 'var(--step--1)',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Code expired — request a new one below
        </div>
      )}

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

      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <Button
          type="button"
          variant="accent"
          onClick={() => void handleVerify()}
          isLoading={isVerifying}
          disabled={code.length !== 6 || isExpired}
          style={{ width: '100%' }}
        >
          Verify
        </Button>

        <Button
          type="button"
          variant="default"
          onClick={() => void handleResend()}
          isLoading={resendState === 'sending'}
          disabled={resendCooldown.isLocked}
          style={{ width: '100%' }}
        >
          {resendCooldown.isLocked
            ? `Resend in ${resendCooldown.formatted}`
            : 'Resend code'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          style={{ width: '100%', color: 'var(--ink-3)' }}
        >
          Cancel
        </Button>
      </div>
    </AuthScreenShell>
  );
}
