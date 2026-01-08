import React from 'react';
import { Logo } from '../../ui-system/components/primitives/Logo';

interface SignInViewProps {
    onGoogleLogin: () => void;
    onAppleLogin?: () => void;
    onXLogin?: () => void;
    onFacebookLogin?: () => void;
    onBackToModeSelection?: () => void;
}

export function SignInView({
    onGoogleLogin,
    onAppleLogin,
    onXLogin,
    onFacebookLogin,
    onBackToModeSelection
}: SignInViewProps) {
    return (
        <div className="w-[360px] h-[600px] bg-bg-base-light dark:bg-bg-base-dark font-display antialiased flex flex-col items-center justify-between p-6">
            {/* Header with Logo + Back link */}
            <header className="w-full flex justify-between items-center">
                <Logo showText={true} />
                {onBackToModeSelection && (
                    <button
                        onClick={onBackToModeSelection}
                        className="text-text-secondary-light dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary transition-colors text-lg font-light underline-offset-4 hover:underline"
                    >
                        Mode
                    </button>
                )}
            </header>

            {/* Main Content - Centered */}
            <div className="flex-1 flex flex-col items-center justify-center w-full -mt-8">
                {/* SIGN IN WITH Label */}
                <div className="flex justify-center mb-10">
                    <p className="text-text-secondary-light dark:text-text-secondary-dark text-xs font-medium tracking-[0.2em] uppercase">
                        Sign in with
                    </p>
                </div>

                {/* Provider Links */}
                <div className="flex flex-col items-center gap-6 w-full">
                    <button
                        onClick={onGoogleLogin}
                        className="login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                        <span className="text-text-primary-light dark:text-text-primary-dark text-4xl font-light tracking-tight group-hover:text-primary transition-colors">
                            Google
                        </span>
                    </button>

                    <button
                        onClick={onAppleLogin}
                        disabled={!onAppleLogin}
                        className="login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className={`text-text-primary-light dark:text-text-primary-dark text-4xl font-light tracking-tight ${onAppleLogin ? 'group-hover:text-primary' : ''} transition-colors`}>
                            Apple
                        </span>
                    </button>

                    <button
                        onClick={onXLogin}
                        disabled={!onXLogin}
                        className="login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className={`text-text-primary-light dark:text-text-primary-dark text-4xl font-light tracking-tight ${onXLogin ? 'group-hover:text-primary' : ''} transition-colors`}>
                            X
                        </span>
                    </button>

                    <button
                        onClick={onFacebookLogin}
                        disabled={!onFacebookLogin}
                        className="login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className={`text-text-primary-light dark:text-text-primary-dark text-4xl font-light tracking-tight ${onFacebookLogin ? 'group-hover:text-primary' : ''} transition-colors`}>
                            Facebook
                        </span>
                    </button>
                </div>
            </div>

            {/* Footer Spacer */}
            <div className="mb-8" />
        </div>
    );
}
