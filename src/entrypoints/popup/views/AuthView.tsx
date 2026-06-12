import React, { useState } from 'react';

import type { OAuthProviderType } from '../../../background/auth/interfaces/i-auth-manager';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';
import { Logo } from '../../../ui-system/components/primitives/Logo';

import { VerificationView } from './VerificationView';


import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

interface AuthViewProps {
    onLoginSuccess: () => void;
    onBackToModeSelection?: () => void;
}

/**
 * AuthView — V2 Editorial migration of the popup auth screen.
 *
 * Body-only root: `display: flex, flex-direction: column, height: 100%, width: 100%`.
 * PopupShell owns the 400x600 chrome; this view returns body content only.
 *
 * V2 token map applied:
 *   - bg-surface / text-on-surface       -> var(--paper) / var(--ink)
 *   - text-on-surface-variant / text-outline -> var(--ink-3)
 *   - text-primary                       -> var(--accent)
 *   - border-outline-variant            -> var(--rule-soft)
 *   - bg-primary-container (icon)        -> var(--accent-tint-08)
 *   - text-[Npx]                         -> var(--step-N)
 *   - min-h-[48px]                       -> minHeight: 44
 *   - font-display                       -> .u-serif
 *   - var(--ink-ease-spring)             -> var(--ease-standard)
 *   - error red color-mix                -> var(--accent-tint-08) with var(--rule) border
 *   - bg-on-surface (submit button)      -> var(--ink) (ink fill, paper text)
 */
export function AuthView({
    onLoginSuccess,
    onBackToModeSelection,
}: AuthViewProps): React.ReactElement {

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
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                overflowY: 'auto',
                position: 'relative',
                backgroundImage: [
                    'radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--accent) 9%, transparent) 0%, transparent 50%)',
                    'radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--accent) 7%, transparent) 0%, transparent 50%)',
                ].join(', '),
            }}
        >
            <main
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '32px 24px',
                    width: '100%',
                    maxWidth: 380,
                    margin: '0 auto',
                }}
            >

                {/* Logo row — left-aligned */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        marginBottom: 28,
                        alignSelf: 'flex-start',
                    }}
                >
                    <Logo size="sm" showText={false} />
                    <span
                        className="u-serif"
                        style={{
                            fontSize: 'var(--step-1)',
                            color: 'var(--ink)',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        underscore
                    </span>
                </div>

                {/* Headline — Instrument Serif italic */}
                <h1
                    className="u-serif"
                    style={{
                        fontSize: 'var(--step-4)',
                        fontWeight: 400,
                        color: 'var(--ink)',
                        textAlign: 'center',
                        letterSpacing: '-0.025em',
                        lineHeight: 1.25,
                        margin: '0 0 8px',
                    }}
                >
                    Your knowledge<br /><em>workspace awaits</em>
                </h1>
                <p
                    className="u-sans"
                    style={{
                        fontSize: 'var(--step--1)',
                        color: 'var(--ink-3)',
                        textAlign: 'center',
                        margin: '0 0 28px',
                    }}
                >
                    Sign in or create an account to continue
                </p>

                {/* OAuth providers — Google (terracotta) + Apple (paper) */}
                <div
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        marginBottom: 16,
                        flexShrink: 0,
                    }}
                >
                    <Button
                        type="button"
                        variant="accent"
                        onClick={() => handleProviderClick('google')}
                        disabled={isLoading || activeProvider !== null}
                    >
                        {activeProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
                    </Button>
                    <Button
                        type="button"
                        variant="default"
                        onClick={() => handleProviderClick('apple')}
                        disabled={isLoading || activeProvider !== null}
                    >
                        {activeProvider === 'apple' ? 'Signing in...' : 'Continue with Apple'}
                    </Button>
                </div>

                {/* OR divider */}
                <div
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        margin: '16px 0',
                    }}
                >
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-soft)' }} />
                    <span
                        className="u-mono"
                        style={{
                            fontSize: 'var(--step--2)',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: 'var(--ink-3)',
                        }}
                    >
                        or
                    </span>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-soft)' }} />
                </div>

                {/* Email / password form */}
                <form
                    onSubmit={handleEmailSubmit}
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 16,
                    }}
                >
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
                    <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        style={{
                            width: '100%',
                            minHeight: 44,
                            padding: '12px 0',
                            marginTop: 4,
                            borderRadius: 'var(--radius)',
                            border: 'none',
                            backgroundColor: 'var(--ink)',
                            color: 'var(--paper)',
                            fontFamily: 'var(--sans)',
                            fontSize: 'var(--step--1)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'opacity 0.2s var(--ease-standard)',
                            opacity: 1,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                    >
                        {isLoading && activeProvider === null ? <Spinner size="sm" /> : (isRegistering ? 'Create account' : 'Sign in')}
                    </button>
                </form>

                {/* Toggle sign-in / register */}
                <p
                    className="u-sans"
                    style={{
                        fontSize: 'var(--step--1)',
                        color: 'var(--ink-3)',
                        textAlign: 'center',
                        margin: '16px 0 0',
                    }}
                >
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setLoginError(null); }}
                        style={{
                            display: 'inline-flex',
                            minHeight: 44,
                            alignItems: 'center',
                            padding: '0 8px',
                            margin: '0 -8px',
                            borderRadius: 'var(--radius)',
                            background: 'transparent',
                            border: 0,
                            cursor: 'pointer',
                            fontFamily: 'var(--sans)',
                            fontSize: 'var(--step--1)',
                            color: 'var(--accent)',
                            fontWeight: 500,
                        }}
                    >
                        {isRegistering ? 'Sign in' : 'Create one'}
                    </button>
                </p>

                {/* Error state — V2 single-accent: error uses --accent */}
                {(loginError || error) && (
                    <div
                        style={{
                            width: '100%',
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--accent-tint-08)',
                            border: '1px solid var(--rule)',
                            color: 'var(--accent)',
                            fontSize: 'var(--step--1)',
                            textAlign: 'center',
                        }}
                    >
                        {loginError || error}
                    </div>
                )}

                {/* Back link */}
                {onBackToModeSelection && (
                    <button
                        type="button"
                        onClick={onBackToModeSelection}
                        style={{
                            display: 'inline-flex',
                            minHeight: 44,
                            alignItems: 'center',
                            gap: 6,
                            borderRadius: 'var(--radius)',
                            padding: '0 8px',
                            marginTop: 8,
                            background: 'transparent',
                            border: 0,
                            cursor: 'pointer',
                            fontFamily: 'var(--sans)',
                            fontSize: 'var(--step--1)',
                            color: 'var(--ink-3)',
                        }}
                    >
                        Back
                    </button>
                )}

            </main>

            {/* Footer */}
            <footer
                style={{
                    flexShrink: 0,
                    padding: '0 24px 24px',
                    textAlign: 'center',
                }}
            >
                <p
                    className="u-mono"
                    style={{
                        fontSize: 'var(--step--2)',
                        color: 'var(--ink-3)',
                        lineHeight: 1.5,
                        margin: 0,
                    }}
                >
                    By continuing, you agree to our{' '}
                    <a
                        href="#"
                        style={{
                            display: 'inline-flex',
                            minHeight: 44,
                            alignItems: 'center',
                            padding: '0 8px',
                            margin: '0 -8px',
                            color: 'var(--ink-3)',
                            textDecoration: 'underline',
                            textUnderlineOffset: 2,
                        }}
                    >
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                        href="#"
                        style={{
                            display: 'inline-flex',
                            minHeight: 44,
                            alignItems: 'center',
                            padding: '0 8px',
                            margin: '0 -8px',
                            color: 'var(--ink-3)',
                            textDecoration: 'underline',
                            textUnderlineOffset: 2,
                        }}
                    >
                        Privacy Policy
                    </a>
                </p>
            </footer>
        </div>
    );
}
