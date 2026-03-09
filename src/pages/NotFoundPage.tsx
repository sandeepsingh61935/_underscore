import React from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * 404 Not Found Page — matches 404.html mockup
 * Centered dimmed logo + "404" + message + back link
 */
export function NotFoundPage(): React.ReactElement {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center bg-surface text-on-surface"
        >
            <div className="text-center">
                {/* Dimmed logo — dimmed prop reduces mark opacity only, badge bg stays solid */}
                <div className="flex justify-center mb-8">
                    <Logo size="sm" showText={false} dimmed />
                </div>

                {/* 404 heading */}
                <h1
                    className="text-[72px] font-light tracking-[-0.04em] mb-3 leading-none text-on-surface"
                >
                    404
                </h1>

                {/* Message */}
                <p
                    className="text-[15px] mb-8 text-on-surface-variant"
                >
                    This page doesn't exist.
                </p>

                {/* Back link */}
                <Link
                    to="/"
                    className="text-[14px] font-medium no-underline text-primary transition-all duration-short ease-standard hover:opacity-80"
                >
                    ← Back to home
                </Link>
            </div>
        </div>
    );
}
