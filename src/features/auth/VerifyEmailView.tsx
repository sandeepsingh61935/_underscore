import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { syncSessionToExtension } from '@/shared/auth/session-bridge';
import { clearIntendedMode, readIntendedMode } from '@/shared/auth/pending-intent';
import { resolveAuthRedirectTarget, stashPendingAuthorizationId } from '@/shared/oauth/oauth-consent-path';
import { verifyEmailOtp, resendEmailOtp } from '@/shared/auth/web-auth-actions';
import { isRateLimitCode } from '@/shared/auth/auth-error-messages';
import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';
import { Button } from '@/ui-system/components/primitives/Button';
import { OtpInput } from '@/ui-system/components/composed/OtpInput';
import { DevEmailHint } from '@/ui-system/components/composed/DevEmailHint';
import { useResendCooldown } from '@/features/auth/hooks/useResendCooldown';

function stashPendingAuthorizationIdFromReturnTo(returnTo: string): void {
    const parsed = new URL(returnTo, 'https://placeholder.local');
    const authorizationId = parsed.searchParams.get('authorization_id');
    if (authorizationId) {
        stashPendingAuthorizationId(authorizationId);
    }
}

/**
 * VerifyEmailView — confirm signup via the 6-digit code emailed by Supabase.
 * Reached from SignInView when signUp() returns a user but no session
 * (email confirmation required).
 */
export function VerifyEmailView(): React.ReactElement {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useApp();

    const email = searchParams.get('email') ?? '';
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [resendState, setResendState] = useState<'idle' | 'sending'>('idle');
    const [showSentNotice, setShowSentNotice] = useState(false);
    const resendCooldown = useResendCooldown();

    useEffect(() => {
        if (!resendCooldown.isLocked) {
            setShowSentNotice(false);
        }
    }, [resendCooldown.isLocked]);

    const redirectAfterAuth = (): void => {
        const returnTo = searchParams.get('returnTo');
        // intendedMode is stashed in sessionStorage rather than carried in the
        // /verify-email URL (see stashIntendedMode) so IntentCatcher can't act
        // on it before the code is verified.
        const intendedMode = readIntendedMode();
        clearIntendedMode();
        if (returnTo) {
            stashPendingAuthorizationIdFromReturnTo(returnTo);
            navigate(resolveAuthRedirectTarget(returnTo));
        } else if (intendedMode === 'pro' || intendedMode === 'pro_xai') {
            window.location.href = `/?intendedMode=${intendedMode}`;
        } else {
            navigate('/home');
        }
    };

    const handleVerify = async (submitted?: string): Promise<void> => {
        const value = submitted ?? code;
        if (value.length !== 6 || isVerifying) return;

        setError(null);
        setIsVerifying(true);
        const result = await verifyEmailOtp(email, value);
        setIsVerifying(false);

        if (!result.success) {
            setError(result.error || 'That code is incorrect or has expired. Try again or resend a new code.');
            setCode('');
            return;
        }

        if (result.session?.user) {
            login({
                id: result.session.user.id,
                email: result.session.user.email || '',
                displayName: result.session.user.email?.split('@')[0] || '',
                provider: 'email',
            });
            await syncSessionToExtension(result.session);
        }
        redirectAfterAuth();
    };

    const handleResend = async (): Promise<void> => {
        setError(null);
        if (resendCooldown.isLocked || resendState === 'sending') return;

        setResendState('sending');
        const result = await resendEmailOtp(email);
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
            <AuthScreenShell variant="web" kicker="Confirm email" title="Missing email address">
                <p className="u-sans" style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
                    <Link to="/sign-in" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                        Back to sign in
                    </Link>
                </p>
            </AuthScreenShell>
        );
    }

    return (
        <AuthScreenShell
            variant="web"
            kicker="Confirm email"
            title="Check your email"
            subtitle={<>Enter the 6-digit code we sent to <strong style={{ color: 'var(--ink)' }}>{email}</strong></>}
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

                    <p className="u-sans" style={{ textAlign: 'center', fontSize: 'var(--step--1)', marginTop: 16 }}>
                        <Link to="/sign-in" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>
                            Back to sign in
                        </Link>
                    </p>
                </>
            }
        >
            <DevEmailHint />

            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0 24px' }}>
                <OtpInput
                    length={6}
                    value={code}
                    onChange={setCode}
                    onComplete={(value) => { void handleVerify(value); }}
                    disabled={isVerifying}
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

            <Button
                type="button"
                variant="accent"
                isLoading={isVerifying}
                disabled={code.length !== 6}
                onClick={() => void handleVerify()}
                style={{ width: '100%', marginBottom: 16 }}
            >
                Verify
            </Button>
        </AuthScreenShell>
    );
}
