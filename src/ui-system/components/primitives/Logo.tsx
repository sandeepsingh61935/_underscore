import React from 'react';

import { cn } from '../../utils/cn';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
    className?: string;
    showText?: boolean;
    size?: LogoSize;
    /**
     * Dims only the SVG mark (not the badge background).
     * Use on NotFoundPage and other empty/error states.
     * Keeps the badge shape visible for contrast in all themes.
     */
    dimmed?: boolean;
}

const sizeMap: Record<LogoSize, { badge: string; text: string; gap: string }> = {
    sm: { badge: 'w-7 h-7',   text: 'text-xl',     gap: 'gap-2' },
    md: { badge: 'w-9 h-9',   text: 'text-[26px]', gap: 'gap-[10px]' },
    lg: { badge: 'w-12 h-12', text: 'text-[32px]', gap: 'gap-3' },
};

/**
 * Logo — MD3 compliant, squircle badge
 *
 * Uses CSS vars from global.css:
 *   --logo-bg                 badge fill (dark in light mode, light in dark mode)
 *   --logo-text               mark fill (inherits via currentColor)
 *   --logo-ambient-reflection subtle inner highlight
 *
 * Mark: Baseline underscore — a horizontal rounded rect in the lower third
 * of the badge. Rendered as SVG, never a font glyph.
 *
 * Shape: squircle (border-radius: 22%) — consistent across all sizes and
 * platforms. Export static assets from this same viewBox.
 */
export function Logo({ className = '', showText = true, size = 'md', dimmed = false }: LogoProps): React.ReactElement {
    const s = sizeMap[size];
    return (
        <div className={cn('flex items-center', s.gap, className)}>
            {/* Badge — squircle shape */}
            <div
                className={cn('relative flex items-center justify-center rounded-[22%] overflow-hidden', s.badge)}
                style={{
                    background: 'var(--logo-bg)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.1)',
                }}
            >
                {/* Ambient reflection — subtle inner highlight at badge bottom */}
                <div
                    className="absolute bottom-0 left-[10%] right-[10%] h-[28%] rounded-full pointer-events-none z-[1]"
                    style={{ background: 'var(--logo-ambient-reflection)' }}
                />

                {/* Baseline mark — vector, not a font glyph */}
                <svg
                    viewBox="0 0 100 100"
                    className={cn(
                        'absolute inset-0 w-full h-full z-[2] transition-opacity duration-short ease-standard',
                        dimmed ? 'opacity-40' : 'opacity-100'
                    )}
                    style={{ color: 'var(--logo-text)' }}
                    aria-hidden="true"
                    focusable="false"
                >
                    <rect x="18" y="66" width="64" height="11" rx="5.5" fill="currentColor" />
                </svg>
            </div>

            {/* Wordmark */}
            {showText && (
                <span className={cn('font-light tracking-[-0.02em] text-on-surface', s.text)}>
                    underscore
                </span>
            )}
        </div>
    );
}
