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
 * Centered layout: Logo (lg) + tagline + CTA → /home + trust signal + footer
 */
export function WelcomePage({ onStartClick }: WelcomePageProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();

  React.useEffect(() => {
    if (isAuthenticated && !onStartClick) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate, onStartClick]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflowY: 'auto',
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
        backgroundImage:
          'radial-gradient(ellipse at 50% -5%, color-mix(in srgb, var(--ink) 8%, transparent) 0%, transparent 55%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 360,
          padding: '48px 24px',
        }}
      >
        {/* Logo badge */}
        <div style={{ marginBottom: 28 }}>
          <Logo size="lg" showText={false} />
        </div>

        {/* App name — Serif display */}
        <h1
          className="u-serif"
          style={{
            fontSize: 'var(--step-7)',
            fontWeight: 400,
            letterSpacing: '-0.035em',
            lineHeight: 1,
            margin: 0,
            marginBottom: 16,
            color: 'var(--ink)',
          }}
        >
          underscore
        </h1>

        {/* Tagline */}
        <p
          className="u-sans"
          style={{
            fontSize: 'var(--step--1)',
            lineHeight: 1.5,
            margin: 0,
            marginBottom: 40,
            color: 'var(--ink-2)',
            maxWidth: 200,
          }}
        >
          Highlight what matters.
          <br />
          Everything else fades away.
        </p>

        {/* CTA */}
        <Button
          variant="primary"
          onClick={() => {
            if (onStartClick) onStartClick();
            else navigate('/home');
          }}
          style={{ marginBottom: 28, padding: '10px 32px' }}
        >
          Get started →
        </Button>

        {/* Trust row */}
        <div
          className="u-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 'var(--step--2)',
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          <span>Free forever</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, backgroundColor: 'var(--ink-3)' }} />
          <span>No ads</span>
          <span style={{ width: 3, height: 3, borderRadius: 9999, backgroundColor: 'var(--ink-3)' }} />
          <span>Private by default</span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '12px 0',
          borderTop: '1px solid var(--rule-soft)',
        }}
      >
        <Link
          to="/privacy"
          className="u-mono"
          style={{
            display: 'inline-flex',
            minHeight: 44,
            alignItems: 'center',
            padding: '0 8px',
            fontSize: 'var(--step--2)',
            color: 'var(--ink-3)',
            textDecoration: 'none',
          }}
        >
          Privacy
        </Link>
        <Link
          to="/terms"
          className="u-mono"
          style={{
            display: 'inline-flex',
            minHeight: 44,
            alignItems: 'center',
            padding: '0 8px',
            fontSize: 'var(--step--2)',
            color: 'var(--ink-3)',
            textDecoration: 'none',
          }}
        >
          Terms
        </Link>
        <a
          href="#help"
          className="u-mono"
          style={{
            display: 'inline-flex',
            minHeight: 44,
            alignItems: 'center',
            padding: '0 8px',
            fontSize: 'var(--step--2)',
            color: 'var(--ink-3)',
            textDecoration: 'none',
          }}
        >
          Help
        </a>
      </div>
    </div>
  );
}
