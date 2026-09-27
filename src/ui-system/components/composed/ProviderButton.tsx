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
      className={cn('provider-btn', className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="anim-spin" aria-hidden="true" />
      ) : (
        <>
          <Icon aria-hidden="true" />
          <span>{children || config.label}</span>
        </>
      )}
    </button>
  );
}
