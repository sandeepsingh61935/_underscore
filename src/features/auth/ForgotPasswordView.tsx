import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { useResendCooldown } from '@/features/auth/hooks/useResendCooldown';
import { isRateLimitCode } from '@/shared/auth/auth-error-messages';
import { requestPasswordReset } from '@/shared/auth/web-auth-actions';
import { DevEmailHint } from '@/ui-system/components/composed/DevEmailHint';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';

/** ForgotPasswordView — request a 6-digit password-reset code by email. */
export function ForgotPasswordView(): React.ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cooldown = useResendCooldown();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (cooldown.isLocked || isSubmitting) return;

    setIsSubmitting(true);
    const result = await requestPasswordReset(email);
    setIsSubmitting(false);

    if (!result.success) {
      if (isRateLimitCode(result.code)) {
        cooldown.start(result.retryAfterMs);
        setError(
          result.error || 'Unable to send a reset code right now. Please try again.'
        );
      } else {
        // Neutral copy: never reveal whether an account exists for this email.
        setError('Unable to send a reset code right now. Please try again.');
      }
      return;
    }
    navigate(`/reset-password?email=${encodeURIComponent(email)}`);
  };

  return (
    <AuthScreenShell
      variant="web"
      kicker="Reset password"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a 6-digit code"
      error={error}
      footer={
        <p
          className="u-sans"
          style={{
            textAlign: 'center',
            fontSize: 'var(--step--1)',
            color: 'var(--ink-3)',
          }}
        >
          <Link
            to="/sign-in"
            style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <DevEmailHint />

      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="email" className="u-kicker" style={{ color: 'var(--ink-3)' }}>
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoFocus
            disabled={isSubmitting || cooldown.isLocked}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={!email || cooldown.isLocked}
          style={{ width: '100%' }}
        >
          {cooldown.isLocked ? `Send in ${cooldown.formatted}` : 'Send code'}
        </Button>
      </form>
    </AuthScreenShell>
  );
}
