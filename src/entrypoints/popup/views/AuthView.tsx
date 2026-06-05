import React, { useState } from 'react';

import type { OAuthProviderType } from '../../../background/auth/interfaces/i-auth-manager';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';
import { Logo } from '../../../ui-system/components/primitives/Logo';

import { VerificationView } from './VerificationView';

import { useApp } from '@/core/context/AppProvider';
import { Input } from '@/ui-system/components/primitives/Input';
import { SocialAuthButton } from '@/ui-system/components/primitives/SocialAuthButton';
import { Spinner } from '@/ui-system/components/primitives/Spinner';
import { cn } from '@/ui-system/utils/cn';

interface AuthViewProps {
    onLoginSuccess: () => void;
    onBackToModeSelection?: () => void;
}

export function AuthView({
    onLoginSuccess,
    onBackToModeSelection,
}: AuthViewProps): React.ReactElement {
    const { setMode } = useApp();
    const {
        login, loginWithEmail, registerWithEmail, isLoading, error,
        verificationStatus, verificationExpiresAt
    } = useCurrentUser();

    const [loginError, setLoginError] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [activeProvider, setActiveProvider] = useState<OAuthProviderType | null>(null);

    const handleProviderClick = async (provider: OAuthProviderType): Promise<void> => {
        setLoginError(null);
        setActiveProvider(provider);
        const result = await login(provider);
        setActiveProvider(null);
        if (result.success) {
            if (isRegistering) setMode('cloud');
            onLoginSuccess();
        } else {
            setLoginError(result.error || 'Login failed. Please try again.');
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoginError(null);
        const action = isRegistering ? registerWithEmail : loginWithEmail;
        const result = await action(email, password);
        if (result.success) {
            if (isRegistering) setMode('cloud');
            onLoginSuccess();
        } else {
            setLoginError(result.error || `${isRegistering ? 'Registration' : 'Login'} failed. Please try again.`);
        }
    };

    if (verificationStatus === 'awaiting') {
        return (
            <VerificationView
                email={email}
                expiresAt={verificationExpiresAt}
                onCheckVerification={onLoginSuccess}
                onCancel={async () => {
                    await chrome.runtime.sendMessage({
                        type: 'CLEAR_VERIFICATION_STATE',
                        timestamp: Date.now()
                    });
                }}
            />
        );
    }

    return (
        <div
            className="w-full h-full flex flex-col bg-surface text-on-surface overflow-y-auto relative"
            style={{
                backgroundImage: [
                    'radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--ink-neural) 9%, transparent) 0%, transparent 50%)',
                    'radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--ink-memory) 7%, transparent) 0%, transparent 50%)',
                ].join(', '),
            }}
        >
            <main className="flex-1 flex flex-col px-6 py-8 w-full max-w-[380px] mx-auto">

                {/* Logo row — left-aligned */}
                <div className="flex items-center gap-[9px] mb-7 self-start">
                    <Logo size="sm" showText={false} />
                    <span className="font-display text-[20px] text-on-surface tracking-[-0.02em]">
                        underscore
                    </span>
                </div>

                {/* Headline — Instrument Serif italic */}
                <h1 className="font-display text-[27px] font-normal text-on-surface text-center tracking-[-0.025em] leading-[1.25] mb-2">
                    Your knowledge<br /><em>workspace awaits</em>
                </h1>
                <p className="text-[13px] text-on-surface-variant text-center mb-7">
                    Sign in or create an account to continue
                </p>

                {/* Social auth buttons */}
                <div className="w-full flex flex-col gap-3 mb-4 shrink-0">
                    <SocialAuthButton
                        provider="google"
                        onClick={() => handleProviderClick('google')}
                        disabled={isLoading || activeProvider !== null}
                        isLoading={activeProvider === 'google'}
                    />
                    <SocialAuthButton
                        provider="apple"
                        onClick={() => handleProviderClick('apple')}
                        disabled={isLoading || activeProvider !== null}
                        isLoading={activeProvider === 'apple'}
                    />
                    <SocialAuthButton
                        provider="phone"
                        onClick={() => handleProviderClick('phone' as OAuthProviderType)}
                        disabled={isLoading || activeProvider !== null}
                        isLoading={activeProvider === ('phone' as OAuthProviderType)}
                    />
                </div>

                {/* OR divider */}
                <div className="w-full flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-outline-variant" />
                    <span className="text-[10px] tracking-[0.14em] uppercase text-outline">or</span>
                    <div className="flex-1 h-px bg-outline-variant" />
                </div>

                {/* Email / password form */}
                <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-2 mb-4">
                    <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="email"
                        className="mb-2"
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                        className="mb-2"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className={cn(
                            'w-full py-3 rounded-[10px] mt-1',
                            'bg-on-surface text-surface',
                            'text-[13px] font-semibold',
                            'transition-all duration-[220ms]',
                            'hover:bg-white hover:-translate-y-[1px]',
                            'hover:shadow-[0_4px_20px_rgba(255,255,255,0.14)]',
                            'active:translate-y-0',
                            'disabled:opacity-40 disabled:pointer-events-none',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                        )}
                        style={{ transitionTimingFunction: 'var(--ink-ease-spring)' }}
                    >
                        {isLoading && activeProvider === null ? <Spinner size="sm" /> : (isRegistering ? 'Create account' : 'Sign in')}
                    </button>
                </form>

                {/* Toggle sign-in / register */}
                <p className="text-[12px] text-outline text-center mt-4">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setLoginError(null); }}
                        className="inline-flex min-h-[48px] items-center px-2 -mx-2 rounded-md bg-transparent border-0 cursor-pointer text-[12px] text-primary font-medium hover:opacity-80 transition-opacity duration-[180ms]"
                    >
                        {isRegistering ? 'Sign in' : 'Create one'}
                    </button>
                </p>

                {/* Error state */}
                {(loginError || error) && (
                    <div className="w-full mt-3 p-3 rounded-[10px] bg-[color-mix(in_srgb,var(--md-sys-color-error)_12%,transparent)] border border-[color-mix(in_srgb,var(--md-sys-color-error)_30%,transparent)] text-error text-[12px] text-center">
                        {loginError || error}
                    </div>
                )}

                {/* Back link */}
                {onBackToModeSelection && (
                    <button
                        type="button"
                        onClick={onBackToModeSelection}
                        className={cn(
                            'inline-flex min-h-[48px] items-center gap-1.5 rounded-md px-2 text-body-small text-outline',
                            'hover:text-on-surface transition-colors duration-[180ms]',
                            'bg-transparent border-0 cursor-pointer',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                        )}
                    >
                        Back
                    </button>
                )}

            </main>

            {/* Footer */}
            <footer className="shrink-0 px-6 pb-6 text-center">
                <p className="text-label-small text-outline leading-relaxed">
                    By continuing, you agree to our{' '}
                    <a
                        href="#"
                        className="inline-flex min-h-[48px] items-center px-2 text-outline hover:text-on-surface-variant underline underline-offset-2 transition-colors duration-[180ms]"
                    >
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                        href="#"
                        className="inline-flex min-h-[48px] items-center px-2 text-outline hover:text-on-surface-variant underline underline-offset-2 transition-colors duration-[180ms]"
                    >
                        Privacy Policy
                    </a>
                </p>
            </footer>
        </div>
    );
}
