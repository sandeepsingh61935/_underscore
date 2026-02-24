import React, { useState } from 'react';
import { useApp } from '@/core/context/AppProvider';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';
import { Logo } from '../../../ui-system/components/primitives/Logo';
import { VerificationView } from './VerificationView';
import type { OAuthProviderType } from '../../../background/auth/interfaces/i-auth-manager';

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

    const handleProviderSelect = async (provider: any) => {
        setLoginError(null);
        console.log('[AuthView] Starting login with provider:', provider);
        const result = await login(provider);
        if (result.success) {
            console.log('[AuthView] Login successful!');
            if (isRegistering) {
                // If the user signed up natively (via OAuth flow they might not technically be in "registration" mode, but just in case)
                setMode('vault');
            }
            onLoginSuccess();
        } else {
            console.error('[AuthView] Login failed:', result.error);
            setLoginError(result.error || 'Login failed. Please try again.');
        }
    };

    // Check if we need to show the verification view
    if (verificationStatus === 'awaiting') {
        return (
            <VerificationView
                email={email || 'your email mapping here'} // Note: the hook doesn't currently reliably pull the "attempted" email if it failed, but we have it in local state
                expiresAt={verificationExpiresAt}
                onCheckVerification={() => {
                    // Normally they would click the link, and re-login manually
                    onLoginSuccess();
                }}
                onCancel={async () => {
                    // Clear state and return to auth view
                    await chrome.runtime.sendMessage({
                        type: 'CLEAR_VERIFICATION_STATE',
                        timestamp: Date.now()
                    });
                }}
            />
        );
    }

    return (
        <div className="w-full h-full flex flex-col items-center max-w-[380px] mx-auto overflow-y-auto">
            {/* Logo area */}
            <div className="flex flex-col items-center mb-8 shrink-0">
                <Logo size="lg" showText={true} />
            </div>

            {/* Main Content Area filling remaining space */}
            <main className="flex-1 flex flex-col items-center justify-center w-full px-6">
                {/* Heading */}
                <h1 className="text-[22px] font-medium tracking-tight text-[var(--text-primary)] mb-1 text-center">
                    {isRegistering ? 'Create your account' : 'Sign in to your account'}
                </h1>
                <p className="text-[14px] text-[var(--text-tertiary)] mb-8 text-center">
                    {isRegistering ? 'Start highlighting what matters' : 'Welcome back'}
                </p>

                {/* Email / Password Form */}
                <form className="w-full mb-6 flex flex-col gap-3" onSubmit={async (e) => {
                    e.preventDefault();
                    setLoginError(null);

                    const action = isRegistering ? registerWithEmail : loginWithEmail;
                    console.log(`[AuthView] Starting email ${isRegistering ? 'registration' : 'login'}...`);

                    const result = await action(email, password);
                    if (result.success) {
                        console.log(`[AuthView] Email ${isRegistering ? 'registration' : 'login'} successful!`);
                        if (isRegistering) {
                            setMode('vault');
                        }
                        onLoginSuccess();
                    } else {
                        console.error(`[AuthView] Email ${isRegistering ? 'registration' : 'login'} failed:`, result.error);
                        setLoginError(result.error || `${isRegistering ? 'Registration' : 'Login'} failed. Please try again.`);
                    }
                }}>
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-[var(--radius)] text-[14px] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-[var(--radius)] text-[14px] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="w-full py-3 mt-2 rounded-[var(--radius)] text-[14px] font-medium transition-all duration-200 cursor-pointer border-none bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] disabled:opacity-50 hover:bg-[var(--md-sys-color-primary)]/90 active:scale-[0.98]"
                    >
                        {isRegistering ? 'Sign up' : 'Sign in'}
                    </button>
                </form>

                {/* Toggle Form Mode */}
                <p className="text-[13px] text-[var(--text-secondary)] mb-8">
                    {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        className="bg-transparent border-none p-0 cursor-pointer text-[var(--accent)] hover:underline"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setLoginError(null);
                        }}
                    >
                        {isRegistering ? 'Sign in' : 'Create one'}
                    </button>
                </p>

                {/* Divider */}
                <div className="w-full flex items-center gap-3 mb-6">
                    <div className="flex-1 h-[1px] bg-[var(--border)]" />
                    <span className="text-[12px] text-[var(--text-tertiary)] uppercase tracking-wider">Or continue with</span>
                    <div className="flex-1 h-[1px] bg-[var(--border)]" />
                </div>

                {/* Social sign-in icons row matching style-c-hybrid sign-in mockup */}
                <div className="flex gap-3 w-full justify-center mb-2">
                    {/* Google */}
                    <button
                        onClick={() => handleProviderClick('google')}
                        disabled={isLoading}
                        className={`
                            h-12 flex-1 rounded-[var(--radius)] border border-[var(--border)]
                            bg-[var(--bg-card)] flex items-center justify-center cursor-pointer
                            transition-all duration-200 shadow-[var(--shadow-rest)]
                            ${isLoading ? 'opacity-50' : 'hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95'}
                        `}
                        title="Sign in with Google"
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.07 11.07 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </button>

                    {/* Apple */}
                    <button
                        onClick={() => handleProviderClick('apple')}
                        disabled={true} /* Disabled for now as per previous auth code */
                        className={`
                            h-12 flex-1 rounded-[var(--radius)] border border-[var(--border)]
                            bg-[var(--bg-card)] flex items-center justify-center cursor-not-allowed
                            transition-all duration-200 shadow-[var(--shadow-rest)] opacity-40
                        `}
                        title="Sign in with Apple (Coming Soon)"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
                            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                    </button>

                    {/* GitHub */}
                    <button
                        onClick={() => { }}
                        disabled={true}
                        className={`
                            h-12 flex-1 rounded-[var(--radius)] border border-[var(--border)]
                            bg-[var(--bg-card)] flex items-center justify-center cursor-not-allowed
                            transition-all duration-200 shadow-[var(--shadow-rest)] opacity-40
                        `}
                        title="Sign in with GitHub (Coming Soon)"
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                    </button>
                </div>

                {/* State messages */}
                {isLoading && (
                    <div className="mt-2 flex flex-col items-center justify-center gap-2 text-sm text-[var(--accent-text)]">
                        <div className="w-5 h-5 rounded-full border-2 border-current border-r-transparent animate-spin" />
                    </div>
                )}
                {(loginError || error) && (
                    <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-[var(--radius-sm)] text-red-500 text-sm text-center">
                        {loginError || error}
                    </div>
                )}

                {/* Back Link */}
                {onBackToModeSelection && (
                    <button
                        onClick={onBackToModeSelection}
                        className="mt-6 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                    >
                        ← Back
                    </button>
                )}
            </main>

            {/* Terms string at bottom */}
            <footer className="mt-auto pt-6 text-center max-w-[320px] shrink-0">
                <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
                    By creating an account, you agree to our{' '}
                    <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent)] underline underline-offset-2 transition-colors">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--accent)] underline underline-offset-2 transition-colors">Privacy Policy</a>
                </p>
            </footer>
        </div>
    );
}
