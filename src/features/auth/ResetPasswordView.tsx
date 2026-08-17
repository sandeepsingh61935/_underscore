import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { syncSessionToExtension } from '@/shared/auth/session-bridge';
import { verifyRecoveryOtp, updatePassword, requestPasswordReset } from '@/shared/auth/web-auth-actions';
import { isRateLimitCode } from '@/shared/auth/auth-error-messages';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { OtpInput } from '@/ui-system/components/composed/OtpInput';
import { DevEmailHint } from '@/ui-system/components/composed/DevEmailHint';
import { useResendCooldown } from '@/features/auth/hooks/useResendCooldown';

/** ResetPasswordView — enter the 6-digit reset code + a new password. */
export function ResetPasswordView(): React.ReactElement {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useApp();
    const email = searchParams.get('email') ?? '';

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
            setError(verifyResult.error || 'That code is incorrect or has expired. Try again or resend a new code.');
            setCode('');
            return;
        }

        const updateResult = await updatePassword(password);
        setIsSubmitting(false);
        if (!updateResult.success) {
            setError(updateResult.error || 'Failed to update password. Please try again.');
            return;
        }

        const session = verifyResult.session;
        if (session?.user) {
            login({
                id: session.user.id,
                email: session.user.email || '',
                displayName: session.user.email?.split('@')[0] || '',
                provider: 'email',
            });
            await syncSessionToExtension(session);
        }

        navigate('/home');
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

    if (!email) {
        return (
            <AuthScreenShell variant="web" kicker="Reset password" title="Missing email address">
                <p className="u-sans" style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
                    <Link to="/forgot-password" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                        Start over
                    </Link>
                </p>
            </AuthScreenShell>
        );
    }

    const showPasswordHelper = password.length < 8;

    return (
        <AuthScreenShell
            variant="web"
            kicker="Reset password"
            title="Enter your reset code"
            subtitle={<>We sent a 6-digit code to <strong style={{ color: 'var(--ink)' }}>{email}</strong></>}
            error={error}
            footer={
                <>
                    <p className="u-sans" style={{ textAlign: 'center', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
                        Didn&apos;t get a code?{' '}
                        <Button
                            variant="ghost"
                            type="button"
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

                    <p className="u-sans" style={{ textAlign: 'center', fontSize: 'var(--step--1)', marginTop: 8 }}>
                        <Link to="/sign-in" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>
                            Back to sign in
                        </Link>
                    </p>
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

            <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor="password" className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                        New password
                    </label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                    {showPasswordHelper ? (
                        <p className="u-sans" style={{ margin: 0, fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                            At least 8 characters
                        </p>
                    ) : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor="confirmPassword" className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                        Confirm password
                    </label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>

                <Button type="submit" variant="primary" isLoading={isSubmitting} style={{ width: '100%' }}>
                    Reset password
                </Button>
            </form>
        </AuthScreenShell>
    );
}
