import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * SignInView — Registration-first auth page
 * Matches sign-in.html mockup: email/password form + social icons + sign-in toggle
 */
export function SignInView(): React.ReactElement {
    const navigate = useNavigate();
    const { login, setIsLoading, isLoading } = useApp();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignIn, setIsSignIn] = useState(false);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            login({
                id: `email-${Date.now()}`,
                email,
                displayName: email.split('@')[0],
                provider: 'email',
                photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=random`,
            });
            navigate('/mode');
        } catch (err) {
            console.error('Auth error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialAuth = async (provider: 'google' | 'apple'): Promise<void> => {
        setIsLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            login({
                id: `${provider}-${Date.now()}`,
                email: `user@${provider}.com`,
                displayName: 'Demo User',
                provider,
                photoUrl: `https://ui-avatars.com/api/?name=Demo+User&background=random`,
            });
            navigate('/mode');
        } catch (err) {
            console.error('Auth error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-on-surface">
            <div className="w-full max-w-[400px] px-6 py-12">
                {/* Back to mode selection */}
                <Link
                    to="/mode"
                    className="inline-flex min-h-[48px] items-center gap-1 rounded-md px-2 -mx-2 text-body-small no-underline mb-8 text-outline transition-all duration-short ease-standard hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                    Back
                </Link>

                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Logo size="md" />
                </div>

                {/* Heading */}
                <h1 className="text-title-large font-semibold mb-2 text-center">
                    {isSignIn ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="text-body-medium text-on-surface-variant mb-8 text-center">
                    {isSignIn
                        ? 'Sign in to access your collections'
                        : 'Unlock your full knowledge workspace'}
                </p>

                {/* Email/password form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="email"
                            className="text-label-medium font-medium uppercase tracking-[0.08em] text-outline"
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

                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="password"
                            className="text-label-medium font-medium uppercase tracking-[0.08em] text-outline"
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
                        variant="filled"
                        isLoading={isLoading}
                        className="w-full"
                    >
                        {isSignIn ? 'Sign in' : 'Create account'}
                    </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-outline-variant" />
                    <span className="text-label-small uppercase tracking-[0.08em] text-outline">
                        or continue with
                    </span>
                    <div className="flex-1 h-px bg-outline-variant" />
                </div>

                {/* Single V2 terracotta CTA (Q8: no vendor brand colors). */}
                <div className="mb-8">
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
                <div className="flex flex-wrap items-center justify-center gap-1 text-center text-body-small text-on-surface-variant">
                    <span>{isSignIn ? "Don't have an account?" : 'Already have an account?'}</span>
                    <Button
                        variant="text"
                        type="button"
                        onClick={() => setIsSignIn(!isSignIn)}
                        className="px-2 font-medium underline"
                    >
                        {isSignIn ? 'Create one' : 'Sign in'}
                    </Button>
                </div>

                {/* Footer */}
                <p className="text-center text-label-small mt-8 leading-relaxed text-outline">
                    By continuing, you agree to our{' '}
                    <a
                        href="#terms"
                        className="inline-flex min-h-[48px] items-center rounded-md px-2 -mx-2 underline text-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        Terms of Service
                    </a>
                    {' '}and{' '}
                    <Link
                        to="/privacy"
                        className="inline-flex min-h-[48px] items-center rounded-md px-2 -mx-2 underline text-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    );
}
