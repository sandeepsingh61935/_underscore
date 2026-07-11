import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { syncSessionToExtension } from '@/shared/auth/session-bridge';
import { resolveAuthRedirectTarget, stashPendingAuthorizationId } from '@/shared/oauth/oauth-consent-path';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * SignInView — Registration-first auth page
 * V2 Editorial redesign: uses var(--paper), var(--ink), var(--accent), var(--rule)
 */
function stashPendingAuthorizationIdFromReturnTo(returnTo: string): void {
    const parsed = new URL(returnTo, 'https://placeholder.local');
    const authorizationId = parsed.searchParams.get('authorization_id');
    if (authorizationId) {
        stashPendingAuthorizationId(authorizationId);
    }
}

export function SignInView(): React.ReactElement {
    const navigate = useNavigate();
    const { login, setIsLoading, isLoading } = useApp();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignIn, setIsSignIn] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setAuthError(null);
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
            const message = err instanceof Error ? err.message : 'Authentication failed';
            setAuthError(message);
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
            const message = err instanceof Error ? err.message : 'OAuth failed';
            setAuthError(message);
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--paper)',
            color: 'var(--ink)'
        }}>
            <div style={{ width: '100%', maxWidth: 400, padding: '48px 24px' }}>
                <Link
                    to="/mode"
                    className="u-sans"
                    style={{
                        display: 'inline-flex',
                        minHeight: '44px',
                        alignItems: 'center',
                        gap: 4,
                        borderRadius: 'var(--radius)',
                        padding: '0 8px',
                        marginLeft: -8,
                        fontSize: 'var(--step--1)',
                        textDecoration: 'none',
                        marginBottom: 32,
                        color: 'var(--ink-3)',
                        transition: 'color 0.15s ease'
                    }}
                >
                    Back
                </Link>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                    <Logo size="md" />
                </div>

                <h1 className="u-serif" style={{ fontSize: 'var(--step-3)', fontWeight: 500, marginBottom: 8, textAlign: 'center' }}>
                    {isSignIn ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="u-sans" style={{ fontSize: 'var(--step-0)', color: 'var(--ink-3)', marginBottom: 32, textAlign: 'center' }}>
                    {isSignIn
                        ? 'Sign in to access your collections'
                        : 'Unlock your full knowledge workspace'}
                </p>

                {authError ? (
                    <div
                        className="u-sans"
                        role="alert"
                        style={{
                            marginBottom: 16,
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

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label htmlFor="email" className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                            Email
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label htmlFor="password" className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                            Password
                        </label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    <Button type="submit" variant="accent" isLoading={isLoading} style={{ width: '100%' }}>
                        {isSignIn ? 'Sign in' : 'Create account'}
                    </Button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--rule-soft)' }} />
                    <span className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                        or continue with
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--rule-soft)' }} />
                </div>

                <div style={{ marginBottom: 32 }}>
                    <Button
                        type="button"
                        variant="accent"
                        onClick={() => void handleSocialAuth()}
                        disabled={isLoading}
                        style={{ width: '100%' }}
                    >
                        Continue with Google
                    </Button>
                </div>

                <div className="u-sans" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
                    <span>{isSignIn ? "Don't have an account?" : 'Already have an account?'}</span>
                    <Button variant="ghost" type="button" onClick={() => setIsSignIn(!isSignIn)} style={{ padding: '0 8px', fontWeight: 500, textDecoration: 'underline' }}>
                        {isSignIn ? 'Create one' : 'Sign in'}
                    </Button>
                </div>

                <p className="u-sans" style={{ textAlign: 'center', fontSize: 'var(--step--2)', marginTop: 32, lineHeight: 1.5, color: 'var(--ink-3)' }}>
                    By continuing, you agree to our{' '}
                    <a href="#terms" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Terms of Service</a>
                    {' '}and{' '}
                    <Link to="/privacy" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
