import React from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * 404 Not Found Page — editorial split: dimmed logo + serif 404 numeral +
 * message + V2 link back home.
 */
export function NotFoundPage(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        width: '100%',
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      {/* Logo (small, dimmed) */}
      <div style={{ marginBottom: 32, opacity: 0.4 }}>
        <Logo size="sm" showText={false} />
      </div>

      {/* 404 heading — serif display */}
      <h1
        className="u-serif"
        style={{
          margin: '0 0 12px',
          fontSize: 'var(--step-7)',
          fontWeight: 400,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: 'var(--ink)',
        }}
      >
        404
      </h1>

      {/* Message */}
      <p
        className="u-sans"
        style={{
          margin: '0 0 32px',
          fontSize: 'var(--step-0)',
          color: 'var(--ink-2)',
          maxWidth: 320,
        }}
      >
        This page doesn&apos;t exist.
      </p>

      {/* Back link — meets 44px touch target */}
      <Link
        to="/"
        className="u-mono"
        style={{
          display: 'inline-flex',
          minHeight: 44,
          alignItems: 'center',
          padding: '0 12px',
          color: 'var(--accent)',
          textDecoration: 'none',
          fontSize: 'var(--step--1)',
          letterSpacing: '0.04em',
        }}
      >
        ← Back to home
      </Link>
    </div>
  );
}
