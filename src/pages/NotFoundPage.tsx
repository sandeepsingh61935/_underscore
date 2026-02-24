import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * 404 Not Found Page — matches 404.html mockup
 * Centered dimmed logo + "404" + message + back link
 */
export function NotFoundPage() {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            <div className="text-center">
                {/* Dimmed logo */}
                <div className="flex justify-center mb-8 opacity-30">
                    <Logo size="sm" showText={false} />
                </div>

                {/* 404 heading */}
                <h1
                    className="text-[72px] font-light tracking-[-0.04em] mb-3 leading-none"
                    style={{ color: 'var(--text-primary)' }}
                >
                    404
                </h1>

                {/* Message */}
                <p
                    className="text-[15px] mb-8"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    This page doesn't exist.
                </p>

                {/* Back link */}
                <Link
                    to="/"
                    className="text-[14px] font-medium no-underline transition-all duration-150 hover:opacity-80"
                    style={{ color: 'var(--accent-text)' }}
                >
                    ← Back to home
                </Link>
            </div>
        </div>
    );
}
