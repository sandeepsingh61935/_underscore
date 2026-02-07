import React from 'react';
import { ProviderButton, AuthProvider } from '../components/composed/ProviderButton';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SignInViewProps {
    onBack?: () => void;
    onProviderSelect: (provider: AuthProvider) => void;
    isLoading?: boolean;
    error?: string | null;
    className?: string;
}

export function SignInView({
    onBack,
    onProviderSelect,
    isLoading = false,
    error,
    className
}: SignInViewProps) {
    return (
        <div className={cn("flex flex-col h-full bg-surface text-on-surface", className)}>
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/50 sticky top-0 bg-surface/95 backdrop-blur z-10">
                {onBack ? (
                    <button
                        onClick={onBack}
                        disabled={isLoading}
                        className="p-1 -ml-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
                        aria-label="Back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                ) : <div className="w-7" />}

                <span className="text-sm font-medium text-muted-foreground">Sign In</span>
                <div className="w-7" /> {/* Spacer for centering */}
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 w-full max-w-sm mx-auto">
                <div className="w-full flex flex-col items-center gap-8">
                    {/* Title & Description */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                        <p className="text-sm text-muted-foreground">
                            Sign in to sync your highlights across devices and access premium features.
                        </p>
                    </div>

                    {/* Provider Buttons */}
                    <div className="w-full flex flex-col gap-3">
                        <ProviderButton
                            provider="google"
                            onClick={() => onProviderSelect('google')}
                            isLoading={isLoading}
                        />
                        <ProviderButton
                            provider="apple"
                            disabled // Not implemented yet
                            onClick={() => onProviderSelect('apple')}
                        />
                        {/* 
                         <ProviderButton
                            provider="x"
                            disabled
                            onClick={() => onProviderSelect('x')}
                        />
                        <ProviderButton
                            provider="facebook"
                            disabled
                            onClick={() => onProviderSelect('facebook')}
                        />
                        */}
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="flex items-start gap-3 p-3 bg-red-50 text-red-900 rounded-lg text-sm dark:bg-red-900/20 dark:text-red-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer hint */}
            <footer className="px-6 py-6 text-center border-t border-outline-variant/30">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    By signing in, you agree to our <a href="#" className="underline hover:text-foreground">Terms of Service</a> and <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
                </p>
            </footer>
        </div>
    );
}
