/**
 * SignInView - Direct copy from design mockup
 * Source: /docs/07-design/sign-in/sign-in-code.html
 */

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
        <div className="bg-background-light dark:bg-background-dark font-display antialiased min-h-screen flex flex-col items-center justify-between p-4 md:p-8">
            <header className="w-full max-w-screen-xl flex justify-between items-center py-4 px-0 md:px-4 mb-auto">
                <Logo showText={true} />
                {onBackToModeSelection && (
                    <div>
                        <a
                            className="text-text-secondary dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors no-underline text-lg md:text-xl font-light underline-offset-4 hover:underline cursor-pointer"
                            onClick={onBackToModeSelection}
                        >
                            Mode
                        </a>
                    </div>
                )}
            </header>

            <div className="w-full max-w-[480px] flex flex-col items-center flex-grow justify-center py-10">
                <div className="w-full flex justify-center mb-10">
                    <p className="text-text-secondary dark:text-gray-400 text-xs font-medium tracking-[0.2em] uppercase">
                        Sign in with
                    </p>
                </div>

                <div className="flex flex-col items-center gap-6 w-full">
                    <a
                        className="login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none no-underline cursor-pointer"
                        onClick={onGoogleLogin}
                    >
                        <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight group-hover:text-primary transition-colors">
                            Google
                        </span>
                    </a>

                    <a
                        className={`login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none no-underline ${!onAppleLogin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={onAppleLogin}
                    >
                        <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight group-hover:text-primary transition-colors">
                            Apple
                        </span>
                    </a>

                    <a
                        className={`login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none no-underline ${!onXLogin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={onXLogin}
                    >
                        <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight group-hover:text-primary transition-colors">
                            X
                        </span>
                    </a>

                    <a
                        className={`login-provider-link group relative flex items-center justify-center w-full py-2 bg-transparent border-none focus:outline-none no-underline ${!onFacebookLogin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={onFacebookLogin}
                    >
                        <span className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight group-hover:text-primary transition-colors">
                            Facebook
                        </span>
                    </a>
                </div>
            </div>

            <div className="w-full mb-auto md:mb-8"></div>
        </div>
    );
}
