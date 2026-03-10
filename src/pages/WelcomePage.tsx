import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives/Button';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { TrustSignal } from '@/ui-system/components/primitives/TrustSignal';

export interface WelcomePageProps {
  onStartClick?: () => void;
}

/**
 * Welcome Page — landing experience
 * Centered layout: Logo (lg) + tagline + CTA → /mode + trust signal + footer
 */
export function WelcomePage({ onStartClick }: WelcomePageProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();

  React.useEffect(() => {
    if (isAuthenticated && !onStartClick) {
      navigate('/mode');
    }
  }, [isAuthenticated, navigate, onStartClick]);

  return (
    <div className="h-full overflow-y-auto w-full flex flex-col items-center justify-center bg-surface text-on-surface">
      <div className="flex flex-col items-center text-center max-w-[480px] px-6 py-12 gap-0">
        {/* Logo badge */}
        <Logo size="lg" showText={false} className="mb-6" />

        {/* App name */}
        <h1 className="text-display-small tracking-[-0.02em] mb-4 text-on-surface">
          underscore
        </h1>

        {/* Tagline */}
        <p className="text-body-large leading-relaxed mb-10 text-on-surface-variant">
          Highlight what matters.
          <br />
          Everything else fades away.
        </p>

        {/* CTA */}
        <Button
          variant="filled"
          onClick={() => {
            if (onStartClick) onStartClick();
            else navigate('/mode');
          }}
          className="mb-6"
          style={{
            boxShadow:
              '0 2px 8px color-mix(in srgb, var(--md-sys-color-primary) 30%, transparent)',
          }}
        >
          Get started →
        </Button>

        {/* Trust signal */}
        <TrustSignal />
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-6 py-4 border-t border-outline-variant">
        <Link
          to="/privacy"
          className="text-label-medium no-underline text-outline transition-colors duration-short ease-standard hover:text-primary"
        >
          Privacy
        </Link>
        <a
          href="#terms"
          className="text-label-medium no-underline text-outline transition-colors duration-short ease-standard hover:text-primary"
        >
          Terms
        </a>
        <a
          href="#help"
          className="text-label-medium no-underline text-outline transition-colors duration-short ease-standard hover:text-primary"
        >
          Help
        </a>
      </div>
    </div>
  );
}
