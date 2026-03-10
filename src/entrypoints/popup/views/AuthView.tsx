import React, { useState } from 'react';

import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { SocialAuthButton } from '@/ui-system/components/primitives/SocialAuthButton';
import { cn } from '@/ui-system/utils/cn';

import type { OAuthProviderType } from '../../../background/auth/interfaces/i-auth-manager';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';
import { Logo } from '../../../ui-system/components/primitives/Logo';

import { VerificationView } from './VerificationView';

interface AuthViewProps {
    onLoginSuccess: () => void;
    onBackToModeSelection?: () => void;
}

export function AuthView({ onLoginSuccess, onBackToModeSelection }: AuthViewProps) {
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

    const handleProviderClick = async (provider: OAuthProviderType) => {
        setLoginError(null);
        setActiveProvider(provider);
        const result = await login(provider);
        setActiveProvider(null);
        if (result.success) {
            if (isRegistering) setMode('vault');
            onLoginSuccess();
        } else {
            setLoginError(result.error || 'Login failed. Please try again.');
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        const action = isRegistering ? registerWithEmail : loginWithEmail;
        const result = await action(email, password);
        if (result.success) {
            if (isRegistering) setMode('vault');
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
        <div className="w-full h-full flex flex-col bg-surface text-on-surface overflow-y-auto">
            <main className="flex-1 flex flex-col items-center px-6 py-8 w-full max-w-[380px] mx-auto">

                {/* Logo */}
                <div className="flex justify-center mb-8 shrink-0">
                    <Logo size="lg" showText />
                </div>

                {/* Heading */}
                <div className="text-center mb-8 shrink-0">
                    <h1 className="text-headline-small text-on-surface mb-2">
                        {isRegistering ? 'Create your account' : 'Log in or sign up'}
                    </h1>
                    <p className="text-body-medium text-on-surface-variant">
                        {isRegistering
                            ? 'Start highlighting what matters'
                            : 'Your knowledge workspace awaits'}
                    </p>
                </div>

                {/* Social auth buttons */}
                <div className="w-full flex flex-col gap-3 mb-6 shrink-0">
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
                <div className="w-full flex items-center gap-3 mb-6 shrink-0">
                    <div className="flex-1 h-px bg-outline-variant" />
                    <span className="text-label-small text-outline uppercase tracking-[0.12em]">OR</span>
                    <div className="flex-1 h-px bg-outline-variant" />
                </div>

                {/* Email / password form */}
                <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-3 mb-4">
                    <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="email"
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    />
                    <Button
                        type="submit"
                        variant="filled"
                        isLoading={isLoading && activeProvider === null}
                        disabled={isLoading || !email || !password}
                        className="w-full"
                    >
                        {isRegistering ? 'Create account' : 'Sign in'}
                    </Button>
                </form>

                {/* Toggle sign-in / register */}
                <p className="text-body-small text-on-surface-variant text-center mb-4">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setLoginError(null); }}
                        className={cn(
                            'inline-flex min-h-[48px] items-center rounded-md px-2 bg-transparent border-0 cursor-pointer text-primary text-body-small font-medium',
                            'hover:text-[color-mix(in_srgb,var(--md-sys-color-primary)_80%,var(--md-sys-color-on-surface))]',
                            'transition-colors duration-short ease-standard',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                        )}
                    >
                        {isRegistering ? 'Sign in' : 'Create one'}
                    </button>
                </p>

                {/* Error state */}
                {(loginError || error) && (
                    <div className="w-full p-3 rounded-md bg-[color-mix(in_srgb,var(--md-sys-color-error)_12%,transparent)] border border-[color-mix(in_srgb,var(--md-sys-color-error)_30%,transparent)] text-error text-body-small text-center mb-4">
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
                            'hover:text-on-surface transition-colors duration-short ease-standard',
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
                        className="inline-flex min-h-[48px] items-center rounded-md px-2 text-outline hover:text-on-surface-variant underline underline-offset-2 transition-colors duration-short focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                        href="#"
                        className="inline-flex min-h-[48px] items-center rounded-md px-2 text-outline hover:text-on-surface-variant underline underline-offset-2 transition-colors duration-short focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        Privacy Policy
                    </a>
                </p>
            </footer>
        </div>
    );
}
