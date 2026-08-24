import React, { useState } from 'react';

import type { OAuthProviderType } from '../../../background/auth/interfaces/i-auth-manager';
import { useClearVerificationState } from '../../../features/auth/hooks/useClearVerificationState';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';

import { ForgotPasswordView } from './ForgotPasswordView';
import { ResetPasswordView } from './ResetPasswordView';
import { VerificationView } from './VerificationView';

import { isAuthEmailUiEnabled } from '@/shared/auth/auth-email-ui';
import { EXISTING_ACCOUNT_CODE, mapAuthError } from '@/shared/auth/auth-error-messages';
import { openLegalDoc, resolveLegalDocUrl } from '@/shared/auth/web-legal-urls';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';

type AuthStep = 'auth' | 'forgot-password' | 'reset-password';

interface AuthViewProps {
    onLoginSuccess: () => void;
    onBack?: () => void;
}

const textLinkStyle: React.CSSProperties = {
    display: 'inline',
    padding: 0,
    margin: 0,
    minHeight: 'auto',
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    fontSize: 'inherit',
    fontWeight: 500,
    color: 'var(--accent)',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
};

const quietLinkStyle: React.CSSProperties = {
    ...textLinkStyle,
    color: 'var(--ink-3)',
    fontWeight: 400,
    fontSize: 'var(--step--1)',
};

/**
 * AuthView — popup auth landing (body-only).
 *
 * Spec: docs/superpowers/specs/2026-07-14-auth-landing-redesign.md
 * PopupShell owns brand chrome; body starts at Back + centered title.
 * No rail / kicker / body wordmark on landing.
 */
export function AuthView({
    onLoginSuccess,
    onBack,
}: AuthViewProps): React.ReactElement {
    const {
        login, loginWithEmail, registerWithEmail, isLoading, error,
        verificationStatus, verificationExpiresAt, verificationEmail,
    } = useCurrentUser();

    const clearVerification = useClearVerificationState();
    const emailUi = isAuthEmailUiEnabled();

    const [loginError, setLoginError] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [activeProvider, setActiveProvider] = useState<OAuthProviderType | null>(null);
    const [step, setStep] = useState<AuthStep>('auth');
    const [resetEmail, setResetEmail] = useState('');

    const handleProviderClick = async (provider: OAuthProviderType): Promise<void> => {
        setLoginError(null);
        setActiveProvider(provider);
        const result = await login(provider);
        setActiveProvider(null);
        if (result.success) {
            onLoginSuccess();
        } else {
            setLoginError(result.error || mapAuthError('oauth', null));
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoginError(null);

        if (isRegistering) {
            if (password.length < 8) {
                setLoginError('Password must be at least 8 characters.');
                return;
            }

            const result = await registerWithEmail(email, password);
            if (!result.success) {
                setLoginError(result.error || mapAuthError('sign-up', null));
                if (result.code === EXISTING_ACCOUNT_CODE) {
                    setIsRegistering(false);
                }
                return;
            }
            if (result.verificationStatus === 'awaiting') {
                return;
            }
            onLoginSuccess();
            return;
        }

        const result = await loginWithEmail(email, password);
        if (result.success) {
            onLoginSuccess();
        } else {
            setLoginError(result.error || mapAuthError('sign-in', null));
        }
    };

    if (verificationStatus === 'awaiting') {
        return (
            <VerificationView
                email={verificationEmail ?? email}
                expiresAt={verificationExpiresAt}
                onVerified={onLoginSuccess}
                onCancel={() => {
                    void clearVerification(undefined);
                }}
            />
        );
    }

    // Email recovery steps only when email UI is enabled (or mid-session after flag-on start).
    if (emailUi && step === 'forgot-password') {
        return (
            <ForgotPasswordView
                onCodeSent={(sentEmail) => {
                    setResetEmail(sentEmail);
                    setStep('reset-password');
                }}
                onBack={() => setStep('auth')}
            />
        );
    }

    if (emailUi && step === 'reset-password') {
        return (
            <ResetPasswordView
                email={resetEmail}
                onSuccess={onLoginSuccess}
                onBack={() => setStep('auth')}
            />
        );
    }

    const showPasswordHelper = isRegistering && password.length < 8;
    const displayError = loginError || error;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                overflowY: 'auto',
            }}
        >
            <main
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: '20px 22px 16px',
                    width: '100%',
                    maxWidth: 400,
                    margin: '0 auto',
                    boxSizing: 'border-box',
                }}
            >
                {onBack ? (
                    <button
                        type="button"
                        onClick={onBack}
                        className="u-sans"
                        aria-label="Back"
                        style={{
                            ...quietLinkStyle,
                            alignSelf: 'flex-start',
                            minHeight: 44,
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: 'var(--step-1)',
                            textDecoration: 'none',
                        }}
                    >
                        ←
                    </button>
                ) : null}

                <div
                    aria-hidden
                    style={{
                        width: 44,
                        height: 44,
                        margin: '0 auto 18px',
                        border: '1px solid var(--ink)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--ink)',
                        color: 'var(--paper)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--serif)',
                        fontSize: 22,
                        fontWeight: 500,
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                    }}
                >
                    _
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                    <h1
                        className="u-serif"
                        style={{
                            fontSize: 'var(--step-3)',
                            fontWeight: 500,
                            color: 'var(--ink)',
                            textAlign: 'center',
                            margin: '0 0 6px',
                            letterSpacing: '-0.025em',
                            lineHeight: 1.2,
                        }}
                    >
                        {emailUi
                            ? isRegistering
                                ? 'Create your account'
                                : 'Welcome back'
                            : 'Sign in'}
                    </h1>
                    <p
                        className="u-sans"
                        style={{
                            fontSize: 'var(--step--1)',
                            color: 'var(--ink-3)',
                            textAlign: 'center',
                            margin: 0,
                            lineHeight: 1.45,
                        }}
                    >
                        {emailUi
                            ? isRegistering
                                ? 'Save highlights to your library.'
                                : 'Open your synced collections.'
                            : 'Save highlights to your library.'}
                    </p>
                </div>

                <div
                    aria-hidden
                    style={{ height: 1, background: 'var(--rule-soft)', width: '100%' }}
                />

                {displayError ? (
                    <div
                        role="alert"
                        className="u-sans"
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--accent-tint-08)',
                            border: '1px solid var(--rule)',
                            color: 'var(--ink)',
                            fontSize: 'var(--step--1)',
                        }}
                    >
                        {displayError}
                    </div>
                ) : null}

                <Button
                    type="button"
                    variant="accent"
                    onClick={() => void handleProviderClick('google')}
                    disabled={isLoading || activeProvider !== null}
                    style={{ width: '100%' }}
                    data-testid="auth-continue-google"
                >
                    {activeProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
                </Button>

                {emailUi ? (
                    <>
                        <div
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-soft)' }} />
                            <span
                                className="u-mono"
                                style={{
                                    fontSize: 'var(--step--2)',
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ink-3)',
                                }}
                            >
                                or email
                            </span>
                            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-soft)' }} />
                        </div>

                        <form
                            onSubmit={(e) => void handleEmailSubmit(e)}
                            data-testid="auth-email-form"
                            style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label htmlFor="popup-email" className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                                    Email
                                </label>
                                <Input
                                    id="popup-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    autoComplete="email"
                                />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                    }}
                                >
                                    <label
                                        htmlFor="popup-password"
                                        className="u-kicker"
                                        style={{ color: 'var(--ink-3)' }}
                                    >
                                        Password
                                    </label>
                                    {!isRegistering ? (
                                        <button
                                            type="button"
                                            onClick={() => setStep('forgot-password')}
                                            style={{
                                                ...quietLinkStyle,
                                                fontSize: 'var(--step--2)',
                                                minHeight: 32,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            Forgot password?
                                        </button>
                                    ) : null}
                                </div>
                                <Input
                                    id="popup-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                />
                                {showPasswordHelper ? (
                                    <p
                                        className="u-sans"
                                        style={{
                                            margin: 0,
                                            fontSize: 'var(--step--2)',
                                            color: 'var(--ink-3)',
                                        }}
                                    >
                                        At least 8 characters
                                    </p>
                                ) : null}
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={isLoading && activeProvider === null}
                                disabled={isLoading || !email || !password}
                                style={{ width: '100%' }}
                            >
                                {isRegistering ? 'Create account' : 'Sign in'}
                            </Button>
                        </form>

                        <p
                            className="u-sans"
                            style={{
                                fontSize: 'var(--step--1)',
                                color: 'var(--ink-3)',
                                textAlign: 'center',
                                margin: 0,
                            }}
                        >
                            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setLoginError(null);
                                }}
                                style={textLinkStyle}
                            >
                                {isRegistering ? 'Sign in' : 'Create one'}
                            </button>
                        </p>
                    </>
                ) : null}
            </main>

            <footer
                style={{
                    flexShrink: 0,
                    padding: '0 22px 20px',
                    textAlign: 'center',
                }}
            >
                <PopupLegalFooter />
            </footer>
        </div>
    );
}

function PopupLegalFooter(): React.ReactElement {
    const privacyUrl = resolveLegalDocUrl('/privacy');
    const termsUrl = resolveLegalDocUrl('/terms');
    const hasLegalLinks = Boolean(privacyUrl && termsUrl);

    const linkStyle: React.CSSProperties = {
        ...quietLinkStyle,
        display: 'inline',
        minHeight: 'auto',
        fontSize: 'inherit',
        color: 'var(--ink-3)',
    };

    return (
        <p
            className="u-sans"
            style={{
                fontSize: 'var(--step--2)',
                color: 'var(--ink-3)',
                lineHeight: 1.5,
                margin: 0,
            }}
        >
            By continuing, you agree to our{' '}
            {hasLegalLinks ? (
                <>
                    <button
                        type="button"
                        style={linkStyle}
                        onClick={() => {
                            openLegalDoc('/terms');
                        }}
                    >
                        Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                        type="button"
                        style={linkStyle}
                        onClick={() => {
                            openLegalDoc('/privacy');
                        }}
                    >
                        Privacy Policy
                    </button>
                </>
            ) : (
                'Terms of Service and Privacy Policy'
            )}
        </p>
    );
}
