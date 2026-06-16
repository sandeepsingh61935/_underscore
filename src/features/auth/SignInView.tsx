import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * SignInView — Registration-first auth page
 * V2 Editorial redesign: uses var(--paper), var(--ink), var(--accent), var(--rule)
 */
export function SignInView(): React.ReactElement {
    const navigate = useNavigate();
    const { setIsLoading, isLoading } = useApp();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignIn, setIsSignIn] = useState(false);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isSignIn) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            }
            
            // Email/password doesn't redirect, so manually handle intent or fallback
            const params = new URLSearchParams(window.location.search);
            const intendedMode = params.get('intendedMode');
            if (intendedMode === 'cloud' || intendedMode === 'ai') {
                window.location.href = `/?intendedMode=${intendedMode}`;
            } else {
                navigate('/mode');
            }
        } catch (err) {
            console.error('Auth error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialAuth = async (provider: 'google' | 'apple'): Promise<void> => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams(window.location.search);
            const intendedMode = params.get('intendedMode');
            const redirectUrl = new URL(window.location.href);
            redirectUrl.pathname = '/'; // Base URL
            if (intendedMode) {
                redirectUrl.searchParams.set('intendedMode', intendedMode);
            }
            
            await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl.toString(),
                }
            });
        } catch (err) {
            console.error('Auth error:', err);
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
                {/* Back to mode selection */}
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

                {/* Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
                    <Logo size="md" />
                </div>

                {/* Heading */}
                <h1 className="u-serif" style={{ fontSize: 'var(--step-3)', fontWeight: 500, marginBottom: 8, textAlign: 'center' }}>
                    {isSignIn ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="u-sans" style={{ fontSize: 'var(--step-0)', color: 'var(--ink-3)', marginBottom: 32, textAlign: 'center' }}>
                    {isSignIn
                        ? 'Sign in to access your collections'
                        : 'Unlock your full knowledge workspace'}
                </p>

                {/* Email/password form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label
                            htmlFor="email"
                            className="u-kicker"
                            style={{ color: 'var(--ink-3)' }}
                        >
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
                        <label
                            htmlFor="password"
                            className="u-kicker"
                            style={{ color: 'var(--ink-3)' }}
                        >
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

                    <Button
                        type="submit"
                        variant="accent"
                        isLoading={isLoading}
                        className="w-full"
                    >
                        {isSignIn ? 'Sign in' : 'Create account'}
                    </Button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--rule-soft)' }} />
                    <span className="u-kicker" style={{ color: 'var(--ink-3)' }}>
                        or continue with
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--rule-soft)' }} />
                </div>

                {/* Single V2 terracotta CTA */}
                <div style={{ marginBottom: 32 }}>
                    <Button
                        type="button"
                        variant="accent"
                        onClick={() => handleSocialAuth('google')}
                        disabled={isLoading}
                        className="w-full"
                    >
                        Continue with Google
                    </Button>
                </div>

                {/* Toggle sign-in / register */}
                <div className="u-sans" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
                    <span>{isSignIn ? "Don't have an account?" : 'Already have an account?'}</span>
                    <Button
                        variant="ghost"
                        type="button"
                        onClick={() => setIsSignIn(!isSignIn)}
                        className="px-2 font-medium underline"
                    >
                        {isSignIn ? 'Create one' : 'Sign in'}
                    </Button>
                </div>

                {/* Footer */}
                <p className="u-sans" style={{ textAlign: 'center', fontSize: 'var(--step--2)', marginTop: 32, lineHeight: 1.5, color: 'var(--ink-3)' }}>
                    By continuing, you agree to our{' '}
                    <a
                        href="#terms"
                        style={{
                            display: 'inline-flex',
                            minHeight: '44px',
                            alignItems: 'center',
                            borderRadius: 'var(--radius)',
                            padding: '0 8px',
                            margin: '0 -8px',
                            textDecoration: 'underline',
                            color: 'var(--ink-3)'
                        }}
                    >
                        Terms of Service
                    </a>
                    {' '}and{' '}
                    <Link
                        to="/privacy"
                        style={{
                            display: 'inline-flex',
                            minHeight: '44px',
                            alignItems: 'center',
                            borderRadius: 'var(--radius)',
                            padding: '0 8px',
                            margin: '0 -8px',
                            textDecoration: 'underline',
                            color: 'var(--ink-3)'
                        }}
                    >
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    );
}
