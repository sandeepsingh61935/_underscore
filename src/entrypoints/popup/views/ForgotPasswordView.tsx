import React, { useState } from 'react';

import { useAuthActions } from '../../../features/auth/hooks/useAuthActions';
import { useResendCooldown } from '../../../features/auth/hooks/useResendCooldown';
import { DevEmailHint } from '../../../ui-system/components/composed/DevEmailHint';

import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { isRateLimitCode } from '@/shared/auth/auth-error-messages';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';

interface ForgotPasswordViewProps {
  onCodeSent: (email: string) => void;
  onBack: () => void;
}

/**
 * ForgotPasswordView — request a 6-digit password-reset code by email.
 *
 * Body-only root: `display: flex, flex-direction: column, height: 100%, width: 100%`.
 * PopupShell owns the 400x600 chrome; this view returns body content only.
 */
export function ForgotPasswordView({
  onCodeSent,
  onBack,
}: ForgotPasswordViewProps): React.ReactElement {
  const { requestPasswordReset } = useAuthActions();

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
    onCodeSent(email);
  };

  return (
    <AuthScreenShell
      variant="popup"
      kicker="Reset password"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a 6-digit code"
      error={error}
      footer={
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          style={{ alignSelf: 'center', display: 'flex', margin: '0 auto' }}
        >
          Back to sign in
        </Button>
      }
    >
      <DevEmailHint />

      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor="popup-forgot-email"
            className="u-kicker"
            style={{ color: 'var(--ink-3)' }}
          >
            Email
          </label>
          <Input
            id="popup-forgot-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting || cooldown.isLocked}
            autoComplete="email"
            autoFocus
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
