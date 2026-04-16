import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives/Button';
import { Logo } from '@/ui-system/components/primitives/Logo';

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
    <div
      className="h-full overflow-y-auto w-full flex flex-col items-center justify-center bg-surface text-on-surface relative"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% -5%, color-mix(in srgb, var(--ink-capture) 12%, transparent) 0%, transparent 55%)',
      }}
    >
      <div className="flex flex-col items-center text-center max-w-[360px] px-6 py-12">
        {/* Logo badge */}
        <Logo size="lg" showText={false} className="mb-7" />

        {/* App name — Instrument Serif */}
        <h1 className="font-display text-[44px] font-normal tracking-[-0.035em] leading-none mb-4 text-on-surface">
          underscore
        </h1>

        {/* Tagline */}
        <p className="text-[14px] leading-relaxed mb-10 text-on-surface-variant max-w-[200px]">
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
          className="mb-7 px-8"
          style={{
            boxShadow: '0 4px 24px color-mix(in srgb, var(--ink-capture) 40%, transparent)',
          }}
        >
          Get started →
        </Button>

        {/* Trust row */}
        <div className="flex items-center gap-2 text-[11px] text-outline">
          <span>Free forever</span>
          <span className="w-[3px] h-[3px] rounded-full bg-outline" />
          <span>No ads</span>
          <span className="w-[3px] h-[3px] rounded-full bg-outline" />
          <span>Private by default</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 py-4 border-t border-outline-variant">
        <Link
          to="/privacy"
          className="inline-flex min-h-[48px] items-center px-2 text-[11px] text-outline no-underline hover:text-on-surface-variant transition-colors duration-[180ms]"
        >
          Privacy
        </Link>
        <a
          href="#terms"
          className="inline-flex min-h-[48px] items-center px-2 text-[11px] text-outline no-underline hover:text-on-surface-variant transition-colors duration-[180ms]"
        >
          Terms
        </a>
        <a
          href="#help"
          className="inline-flex min-h-[48px] items-center px-2 text-[11px] text-outline no-underline hover:text-on-surface-variant transition-colors duration-[180ms]"
        >
          Help
        </a>
      </div>
    </div>
  );
}
