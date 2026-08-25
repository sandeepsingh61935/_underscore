import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { syncSessionToExtension } from '@/shared/auth/session-bridge';
import { stashIntendedMode } from '@/shared/auth/pending-intent';
import { isAuthEmailUiEnabled } from '@/shared/auth/auth-email-ui';
import { mapAuthError, isExistingAccountSignup } from '@/shared/auth/auth-error-messages';
import { resolveAuthRedirectTarget, stashPendingAuthorizationId } from '@/shared/oauth/oauth-consent-path';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';

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

export function SignInView(): React.ReactElement {
    const navigate = useNavigate();
    const { login, setIsLoading, isLoading } = useApp();
    const emailUi = isAuthEmailUiEnabled();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignIn, setIsSignIn] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

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
                navigate('/home');
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
                const target = resolveAuthRedirectTarget(returnTo);
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

    const handleGuest = (): void => {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');
        const intendedMode = params.get('intendedMode');
        if (returnTo) {
            stashPendingAuthorizationIdFromReturnTo(returnTo);
            navigate(resolveAuthRedirectTarget(returnTo));
            return;
        }
        if (intendedMode) {
            stashIntendedMode(intendedMode);
        }
        navigate('/home');
    };

    return (
        <div className="auth-signin" data-testid="auth-signin-page">
            <div className="auth-signin__card" data-od-id="signin-card">
                <div className="auth-signin__brand" aria-hidden>
                    <div
                        className="welcome__logo-mark"
                        style={{
                            width: 44,
                            height: 44,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '22%',
                            overflow: 'hidden',
                            backgroundColor: 'var(--ink)',
                            boxShadow: '0 0 0 1px color-mix(in srgb, var(--ink) 12%, transparent)',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                left: '10%',
                                right: '10%',
                                height: '28%',
                                borderRadius: 9999,
                                backgroundColor: 'color-mix(in srgb, var(--paper) 8%, transparent)',
                                pointerEvents: 'none',
                                zIndex: 1,
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                bottom: '22%',
                                left: '18%',
                                right: '18%',
                                height: '13%',
                                borderRadius: 9999,
                                backgroundColor: 'var(--paper)',
                                zIndex: 2,
                            }}
                        />
                    </div>
                </div>
                <h1 className="u-serif auth-signin__title">
                    {emailUi ? (isSignIn ? 'Welcome back' : 'Create your account') : 'Sign in to underscore'}
                </h1>
                <p className="u-sans auth-signin__subtitle">
                    {emailUi ? (
                        isSignIn ? (
                            'Open your synced collections.'
                        ) : (
                            'Save highlights to your library.'
                        )
                    ) : (
                        <>
                            Sync highlights across devices. Guest
                            <br />
                            keeps everything local.
                        </>
                    )}
                </p>

                {authError ? (
                    <div className="u-sans auth-signin__error" role="alert">
                        {authError}
                    </div>
                ) : null}

                <button
                    type="button"
                    className="auth-signin__google"
                    onClick={() => void handleSocialAuth()}
                    disabled={isLoading}
                    data-testid="auth-continue-google"
                >
                    <span className="auth-signin__google-icon" aria-hidden>
                        <svg width="18" height="18" viewBox="0 0 48 48" role="img">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            <path fill="none" d="M0 0h48v48H0z" />
                        </svg>
                    </span>
                    Continue with Google
                </button>

                <div className="auth-signin__divider" aria-hidden>
                    <span className="auth-signin__line" />
                    <span className="u-mono auth-signin__or">{emailUi ? 'or email' : 'OR'}</span>
                    <span className="auth-signin__line" />
                </div>

                {emailUi ? (
                    <>
                        <form
                            onSubmit={(e) => void handleSubmit(e)}
                            className="auth-signin__form"
                            data-testid="auth-email-form"
                            style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <label htmlFor="password" className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                                        Password
                                    </label>
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
                            </div>

                            <Button type="submit" variant="primary" isLoading={isLoading} style={{ width: '100%' }}>
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
                                marginBottom: 16,
                            }}
                        >
                            <span>{isSignIn ? "Don't have an account?" : 'Already have an account?'}</span>
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
                    </>
                ) : null}

                <button
                    type="button"
                    className="auth-signin__guest"
                    onClick={handleGuest}
                    disabled={isLoading}
                    data-testid="auth-continue-guest"
                    data-od-id="signin-continue-guest"
                >
                    Continue as guest
                </button>

                <p className="u-sans auth-signin__legal">
                    By continuing you agree to <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy</Link>.
                </p>
            </div>
        </div>
    );
}
