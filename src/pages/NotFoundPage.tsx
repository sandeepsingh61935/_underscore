import React from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * 404 Not Found Page — matches 404.html mockup
 * Centered dimmed logo + "404" + message + back link
 */
export function NotFoundPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-on-surface">
      <div className="text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="sm" showText={false} />
        </div>

        {/* 404 heading */}
        <h1 className="text-display-large tracking-[-0.04em] mb-3 text-on-surface">
          404
        </h1>

        {/* Message */}
        <p className="text-body-medium mb-8 text-on-surface-variant">
          This page doesn't exist.
        </p>

        {/* Back link */}
        <Link
          to="/"
          className="inline-flex min-h-[48px] items-center rounded-md px-2 text-label-large no-underline text-primary transition-all duration-short ease-standard hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
