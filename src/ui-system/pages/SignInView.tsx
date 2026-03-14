import { AlertCircle, ChevronLeft } from 'lucide-react';
import React from 'react';

import type { AuthProvider } from '../components/composed/ProviderButton';
import { ProviderButton } from '../components/composed/ProviderButton';
import { AppHeader } from '../components/layout/AppHeader';
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
  className,
}: SignInViewProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col h-full bg-surface text-on-surface', className)}>
      {/* Header — standalone compact: Logo centred, no nav controls in header */}
      <AppHeader variant="standalone" compact />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 w-full max-w-sm mx-auto">
        <div className="w-full flex flex-col items-center gap-8">
          {/* Back — in content body when provided, not in header */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className="self-start inline-flex min-h-[48px] items-center gap-1.5 rounded-md px-2 -mx-2 border-0 bg-transparent cursor-pointer text-body-small text-outline transition-colors duration-short ease-standard hover:text-on-surface disabled:opacity-disabled disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Go back"
            >
              <ChevronLeft size={13} />
              Back
            </button>
          )}

          {/* Title & Description */}
          <div className="text-center space-y-2">
            <h1 className="text-title-large tracking-tight text-on-surface">
              Welcome back
            </h1>
            <p className="text-body-medium text-on-surface-variant">
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
              disabled
              onClick={() => onProviderSelect('apple')}
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-[color-mix(in_srgb,var(--md-sys-color-error)_8%,transparent)] text-body-small text-error">
              <AlertCircle className="w-5 h-5 shrink-0 text-error" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer hint */}
      <footer className="px-6 py-6 text-center border-t border-outline-variant">
        <p className="text-body-small text-on-surface-variant leading-relaxed">
          By signing in, you agree to our{' '}
          <a
            href="#"
            className="underline text-on-surface-variant hover:text-on-surface transition-colors duration-short ease-standard"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="#"
            className="underline text-on-surface-variant hover:text-on-surface transition-colors duration-short ease-standard"
          >
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
