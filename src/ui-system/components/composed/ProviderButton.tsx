import React from 'react';
import { cn } from '../../utils/cn';
import { Mail, Facebook, Twitter, Github, Loader2 } from 'lucide-react';

export type AuthProvider = 'google' | 'apple' | 'x' | 'facebook' | 'github';

interface ProviderConfig {
    label: string;
    icon: React.ElementType; // Using Lucide icons as placeholders for brand logos
    className: string;
}

const PROVIDER_CONFIG: Record<AuthProvider, ProviderConfig> = {
    google: {
        label: 'Continue with Google',
        icon: Mail, // Placeholder for Google G
        className: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
    },
    apple: {
        label: 'Continue with Apple',
        icon: Github, // Placeholder (Apple icon often unavailable in free sets) - using Github as tech proxy or just generic
        className: 'hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300',
    },
    x: {
        label: 'Continue with X',
        icon: Twitter,
        className: 'hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300',
    },
    facebook: {
        label: 'Continue with Facebook',
        icon: Facebook,
        className: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
    },
    github: {
        label: 'Continue with GitHub',
        icon: Github,
        className: 'hover:bg-zinc-50 hover:text-zinc-900 hover:border-zinc-300',
    },
};

export interface ProviderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    provider: AuthProvider;
    isLoading?: boolean;
}

export function ProviderButton({
    provider,
    isLoading,
    className,
    disabled,
    children,
    ...props
}: ProviderButtonProps) {
    const config = PROVIDER_CONFIG[provider];
    const Icon = config.icon;

    return (
        <button
            type="button"
            disabled={disabled || isLoading}
            className={cn(
                "relative flex items-center justify-center w-full px-4 py-3 gap-3",
                "bg-surface text-on-surface border border-outline rounded-lg",
                "text-sm font-medium transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isLoading && !disabled && "hover:shadow-sm hover:border-primary/50",
                config.className,
                className
            )}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
                <>
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{children || config.label}</span>
                </>
            )}
        </button>
    );
}
