import React, { useState } from 'react';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';
import type { OAuthProviderType } from '../../../background/auth/interfaces/i-auth-manager';

interface AuthViewProps {
    onLoginSuccess: () => void;
    onBackToModeSelection?: () => void;
}

const providers: Array<{
    id: OAuthProviderType;
    label: string;
    enabled: boolean;
}> = [
        { id: 'google', label: 'Google', enabled: true },
        { id: 'apple', label: 'Apple', enabled: false },
        { id: 'twitter', label: 'X', enabled: false },
        { id: 'facebook', label: 'Facebook', enabled: false },
    ];

export function AuthView({ onLoginSuccess, onBackToModeSelection }: AuthViewProps) {
    const { login, isLoading, error } = useCurrentUser();
    const [loginError, setLoginError] = useState<string | null>(null);

    const handleProviderClick = async (provider: OAuthProviderType) => {
        setLoginError(null);

        console.log('[AuthView] Starting login with provider:', provider);
        const result = await login(provider);

        if (result.success) {
            console.log('[AuthView] Login successful!');
            onLoginSuccess();
        } else {
            console.error('[AuthView] Login failed:', result.error);
            setLoginError(result.error || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="w-[400px] h-[600px] flex flex-col bg-surface text-on-surface">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                {onBackToModeSelection && (
                    <button
                        onClick={onBackToModeSelection}
                        className="text-on-surface-variant hover:text-on-surface transition-colors"
                        aria-label="Back"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}
                <span className="text-sm font-medium text-on-surface-variant">Sign In</span>
                <div className="w-5" /> {/* Spacer for centering */}
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                <div className="w-full max-w-xs flex flex-col items-center">
                    {/* Title */}
                    <h1 className="text-center text-xs font-medium uppercase tracking-[0.15em] text-on-surface-variant mb-10">
                        Sign in with
                    </h1>

                    {/* Provider Buttons */}
                    <div className="w-full flex flex-col items-center gap-5">
                        {providers.map((provider) => (
                            <button
                                key={provider.id}
                                onClick={() => handleProviderClick(provider.id)}
                                disabled={isLoading || !provider.enabled}
                                className={`
                                    group relative flex items-center justify-center py-2 
                                    bg-transparent border-none cursor-pointer 
                                    focus:outline-none focus:ring-2 focus:ring-primary/50 rounded
                                    transition-all duration-200
                                    ${!provider.enabled ? 'opacity-40 cursor-not-allowed' : ''}
                                    ${isLoading ? 'opacity-60' : ''}
                                `}
                            >
                                <span className="text-2xl font-light tracking-tight text-on-surface group-hover:text-primary transition-colors">
                                    {provider.label}
                                </span>
                                {!provider.enabled && (
                                    <span className="ml-2 text-xs text-on-surface-variant">(Coming soon)</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="mt-8 flex items-center gap-2 text-sm text-on-surface-variant">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Signing in...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {(loginError || error) && (
                        <div className="mt-6 p-3 bg-error-container rounded-lg text-error text-sm text-center max-w-full">
                            {loginError || error}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer hint */}
            <footer className="px-6 py-4 text-center">
                <p className="text-xs text-on-surface-variant">
                    By signing in, you agree to sync your highlights across devices.
                </p>
            </footer>
        </div>
    );
}
