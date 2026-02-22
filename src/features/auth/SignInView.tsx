import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { SocialButton } from '@/ui-system/components/primitives/SocialButton';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

/**
 * SignInView — Registration-first auth page
 * Matches sign-in.html mockup: email/password form + social icons + sign-in toggle
 */
export function SignInView() {
    const navigate = useNavigate();
    const { login, setIsLoading, isLoading } = useApp();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignIn, setIsSignIn] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
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

    const handleSocialAuth = async (provider: 'google' | 'apple' | 'github') => {
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
        <div
            className="min-h-screen flex flex-col items-center justify-center"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            <div className="w-full max-w-[400px] px-6 py-12">
                {/* Back to mode selection */}
                <Link
                    to="/mode"
                    className="inline-flex items-center gap-1 text-[13px] no-underline mb-8 transition-colors hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    ← Back
                </Link>

                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Logo size="md" />
                </div>

                {/* Heading */}
                <h1
                    className="text-[22px] font-semibold mb-2 text-center"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {isSignIn ? 'Welcome back' : 'Create your account'}
                </h1>
                <p
                    className="text-[14px] mb-8 text-center"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {isSignIn
                        ? 'Sign in to access your collections'
                        : 'Unlock your full knowledge workspace'}
                </p>

                {/* Email/password form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="email"
                            className="text-[12px] font-medium uppercase tracking-[0.08em]"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            className="w-full px-4 py-3 text-[14px] rounded-[var(--radius)] outline-none transition-all duration-150 focus:ring-2"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="password"
                            className="text-[12px] font-medium uppercase tracking-[0.08em]"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-3 text-[14px] rounded-[var(--radius)] outline-none transition-all duration-150 focus:ring-2"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-[var(--radius)] text-[14px] font-medium text-white border-none cursor-pointer transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{
                            background: 'var(--accent)',
                            boxShadow: '0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent)',
                        }}
                    >
                        {isLoading ? (
                            <Spinner size="sm" />
                        ) : (
                            isSignIn ? 'Sign in' : 'Create account'
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span
                        className="text-[12px] uppercase tracking-[0.08em]"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        or continue with
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                </div>

                {/* Social buttons */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <SocialButton provider="google" onClick={() => handleSocialAuth('google')} disabled={isLoading} />
                    <SocialButton provider="apple" onClick={() => handleSocialAuth('apple')} disabled={isLoading} />
                    <SocialButton provider="github" onClick={() => handleSocialAuth('github')} disabled={isLoading} />
                </div>

                {/* Toggle sign-in / register */}
                <p className="text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    {isSignIn ? (
                        <>
                            Don't have an account?{' '}
                            <button
                                onClick={() => setIsSignIn(false)}
                                className="bg-transparent border-none cursor-pointer font-medium underline"
                                style={{ color: 'var(--accent-text)' }}
                            >
                                Create one
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button
                                onClick={() => setIsSignIn(true)}
                                className="bg-transparent border-none cursor-pointer font-medium underline"
                                style={{ color: 'var(--accent-text)' }}
                            >
                                Sign in
                            </button>
                        </>
                    )}
                </p>

                {/* Footer */}
                <p
                    className="text-center text-[11px] mt-8 leading-relaxed"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    By continuing, you agree to our{' '}
                    <a href="#terms" className="underline" style={{ color: 'var(--text-tertiary)' }}>Terms of Service</a>
                    {' '}and{' '}
                    <Link to="/privacy" className="underline" style={{ color: 'var(--text-tertiary)' }}>Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
