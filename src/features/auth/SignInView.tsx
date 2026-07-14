import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { AuthLandingChrome } from '@/features/auth/components/AuthLandingChrome';
import { useApp } from '@/core/context/AppProvider';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { syncSessionToExtension } from '@/shared/auth/session-bridge';
import { stashIntendedMode } from '@/shared/auth/pending-intent';
import { mapAuthError, isExistingAccountSignup } from '@/shared/auth/auth-error-messages';
import { navigateAuthLandingBack } from '@/shared/auth/navigate-auth-landing-back';
import { resolveAuthRedirectTarget, stashPendingAuthorizationId } from '@/shared/oauth/oauth-consent-path';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';

/**
 * SignInView — registration-first auth landing (web SPA).
 *
 * Spec: docs/superpowers/specs/2026-07-14-auth-landing-redesign.md
 * After mock: chrome brand only · no rail/kicker · soft fields ·
 * history-aware Back · text secondary links · centered title.
 */
function stashPendingAuthorizationIdFromReturnTo(returnTo: string): void {
    const parsed = new URL(returnTo, 'https://placeholder.local');
    const authorizationId = parsed.searchParams.get('authorization_id');
    if (authorizationId) {
        stashPendingAuthorizationId(authorizationId);
    }
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

export function SignInView(): React.ReactElement {
    const navigate = useNavigate();
    const { login, setIsLoading, isLoading } = useApp();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignIn, setIsSignIn] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const handleBack = (): void => {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');
        navigateAuthLandingBack({
            returnTo,
            resolveReturnTo: (value) => resolveAuthRedirectTarget(value),
            navigate: (path) => {
                if (returnTo && path !== '/mode') {
                    stashPendingAuthorizationIdFromReturnTo(returnTo);
                }
                navigate(path);
            },
        });
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setAuthError(null);

        if (!isSignIn && password.length < 8) {
            setAuthError('Password must be at least 8 characters.');
            return;
        }

        setIsLoading(true);
        try {
            const supabase = getWebSupabaseClient();
            let session;
            if (isSignIn) {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                session = data.session;
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                session = data.session;

                if (isExistingAccountSignup(data.user, session)) {
                    setAuthError(mapAuthError('sign-up', { code: 'user_already_exists' }));
                    setIsSignIn(true);
                    setIsLoading(false);
                    return;
                }

                if (!session) {
                    const params = new URLSearchParams(window.location.search);
                    const forward = new URLSearchParams({ email });
                    const returnTo = params.get('returnTo');
                    const intendedMode = params.get('intendedMode');
                    if (returnTo) forward.set('returnTo', returnTo);
                    if (intendedMode) stashIntendedMode(intendedMode);
                    navigate(`/verify-email?${forward.toString()}`);
                    return;
                }
            }

            if (session?.user) {
                login({
                    id: session.user.id,
                    email: session.user.email || '',
                    displayName: session.user.email?.split('@')[0] || '',
                    provider: 'email',
                });
                await syncSessionToExtension(session);
            }

            const params = new URLSearchParams(window.location.search);
            const returnTo = params.get('returnTo');
            const intendedMode = params.get('intendedMode');
            if (returnTo) {
                stashPendingAuthorizationIdFromReturnTo(returnTo);
                navigate(resolveAuthRedirectTarget(returnTo));
            } else if (intendedMode === 'pro' || intendedMode === 'pro_xai') {
                window.location.href = `/?intendedMode=${intendedMode}`;
            } else {
                navigate('/mode');
            }
        } catch (err) {
            const mappable = err instanceof Error
                ? { message: err.message, code: (err as { code?: string }).code }
                : String(err);
            setAuthError(mapAuthError(isSignIn ? 'sign-in' : 'sign-up', mappable));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialAuth = async (): Promise<void> => {
        setAuthError(null);
        setIsLoading(true);
        try {
            const supabase = getWebSupabaseClient();
            const params = new URLSearchParams(window.location.search);
            const intendedMode = params.get('intendedMode');
            const returnTo = params.get('returnTo');
            const redirectUrl = new URL(window.location.origin);

            if (returnTo) {
                stashPendingAuthorizationIdFromReturnTo(returnTo);
                const target = resolveAuthRedirectTarget(returnTo, '/mode');
                const parsed = new URL(target, window.location.origin);
                redirectUrl.pathname = parsed.pathname;
                redirectUrl.search = parsed.search;
            } else {
                redirectUrl.pathname = '/';
                if (intendedMode) {
                    redirectUrl.searchParams.set('intendedMode', intendedMode);
                }
            }

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl.toString(),
                },
            });
            if (error) throw error;
        } catch (err) {
            const mappable = err instanceof Error
                ? { message: err.message, code: (err as { code?: string }).code }
                : String(err);
            setAuthError(mapAuthError('oauth', mappable));
            setIsLoading(false);
        }
    };

    const showPasswordHelper = !isSignIn && password.length < 8;
    const modeStatus = isSignIn ? 'Welcome back' : 'Create account';

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--paper)',
                color: 'var(--ink)',
            }}
        >
            <AuthLandingChrome modeStatus={modeStatus} />

            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: 400,
                        padding: '28px 32px 36px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        boxSizing: 'border-box',
                    }}
                >
                    <button
                        type="button"
                        onClick={handleBack}
                        className="u-sans"
                        aria-label="Back to settings"
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

                    <div style={{ textAlign: 'center', width: '100%' }}>
                        <h1
                            className="u-serif"
                            style={{
                                fontSize: 'var(--step-3)',
                                fontWeight: 500,
                                margin: '0 0 8px',
                                textAlign: 'center',
                                letterSpacing: '-0.025em',
                                lineHeight: 1.2,
                            }}
                        >
                            {isSignIn ? 'Welcome back' : 'Create your account'}
                        </h1>
                        <p
                            className="u-sans"
                            style={{
                                fontSize: 'var(--step-0)',
                                color: 'var(--ink-3)',
                                margin: 0,
                                textAlign: 'center',
                                lineHeight: 1.45,
                            }}
                        >
                            {isSignIn
                                ? 'Open your synced collections.'
                                : 'Save highlights to your library.'}
                        </p>
                    </div>

                    <div
                        aria-hidden
                        style={{ height: 1, background: 'var(--rule-soft)', width: '100%' }}
                    />

                    {authError ? (
                        <div
                            className="u-sans"
                            role="alert"
                            style={{
                                padding: '12px 14px',
                                borderRadius: 'var(--radius)',
                                border: '1px solid var(--rule)',
                                background: 'var(--accent-tint-08)',
                                color: 'var(--ink)',
                                fontSize: 'var(--step--1)',
                            }}
                        >
                            {authError}
                        </div>
                    ) : null}

                    <Button
                        type="button"
                        variant="accent"
                        onClick={() => void handleSocialAuth()}
                        disabled={isLoading}
                        style={{ width: '100%' }}
                    >
                        Continue with Google
                    </Button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--rule-soft)' }} />
                        <span
                            className="u-mono"
                            style={{
                                color: 'var(--ink-3)',
                                fontSize: 'var(--step--2)',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                            }}
                        >
                            or email
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'var(--rule-soft)' }} />
                    </div>

                    <form
                        onSubmit={(e) => void handleSubmit(e)}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
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
                                    htmlFor="password"
                                    className="u-kicker"
                                    style={{ color: 'var(--ink-3)' }}
                                >
                                    Password
                                </label>
                                {isSignIn ? (
                                    <Link
                                        to="/forgot-password"
                                        className="u-sans"
                                        style={{
                                            fontSize: 'var(--step--2)',
                                            color: 'var(--ink-3)',
                                            textDecoration: 'underline',
                                            textUnderlineOffset: 2,
                                        }}
                                    >
                                        Forgot password?
                                    </Link>
                                ) : null}
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                autoComplete={isSignIn ? 'current-password' : 'new-password'}
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
                            isLoading={isLoading}
                            style={{ width: '100%' }}
                        >
                            {isSignIn ? 'Sign in' : 'Create account'}
                        </Button>
                    </form>

                    <div
                        className="u-sans"
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            textAlign: 'center',
                            fontSize: 'var(--step--1)',
                            color: 'var(--ink-3)',
                        }}
                    >
                        <span>
                            {isSignIn ? "Don't have an account?" : 'Already have an account?'}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignIn(!isSignIn);
                                setAuthError(null);
                            }}
                            style={textLinkStyle}
                        >
                            {isSignIn ? 'Create one' : 'Sign in'}
                        </button>
                    </div>

                    <p
                        className="u-sans"
                        style={{
                            textAlign: 'center',
                            fontSize: 'var(--step--2)',
                            margin: 0,
                            lineHeight: 1.5,
                            color: 'var(--ink-3)',
                        }}
                    >
                        By continuing, you agree to our{' '}
                        <Link
                            to="/terms"
                            style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}
                        >
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link
                            to="/privacy"
                            style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}
                        >
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
