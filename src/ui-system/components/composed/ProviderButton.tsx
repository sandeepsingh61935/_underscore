import { Mail, Facebook, Twitter, Github, Loader2 } from 'lucide-react';
import React from 'react';

import { cn } from '../../utils/cn';

export type AuthProvider = 'google' | 'apple' | 'x' | 'facebook' | 'github';

interface ProviderConfig {
  label: string;
  icon: React.ElementType;
}

const PROVIDER_CONFIG: Record<AuthProvider, ProviderConfig> = {
  google: {
    label: 'Continue with Google',
    icon: Mail,
  },
  apple: {
    label: 'Continue with Apple',
    icon: Github,
  },
  x: {
    label: 'Continue with X',
    icon: Twitter,
  },
  facebook: {
    label: 'Continue with Facebook',
    icon: Facebook,
  },
  github: {
    label: 'Continue with GitHub',
    icon: Github,
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
}: ProviderButtonProps): React.JSX.Element {
  const config = PROVIDER_CONFIG[provider];
  const Icon = config.icon;

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={cn(
        'relative flex min-h-[44px] w-full items-center justify-center gap-3 px-4 py-3',
        'border rounded duration-step-0 ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      style={{
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
        borderColor: 'var(--rule)',
        fontSize: 'var(--step-0)',
      }}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--ink-3)' }} />
      ) : (
        <>
          <Icon className="w-5 h-5 shrink-0" />
          <span>{children || config.label}</span>
        </>
      )}
    </button>
  );
}
