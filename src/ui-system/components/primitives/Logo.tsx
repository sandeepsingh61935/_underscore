import React from 'react';
import { cn } from '../../utils/cn';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
    className?: string;
    showText?: boolean;
    size?: LogoSize;
}

const sizeMap: Record<LogoSize, { badge: string; underscore: string; text: string; gap: string }> = {
    sm: { badge: 'w-7 h-7', underscore: 'text-lg', text: 'text-xl', gap: 'gap-2' },
    md: { badge: 'w-9 h-9', underscore: 'text-2xl', text: 'text-[26px]', gap: 'gap-[10px]' },
    lg: { badge: 'w-12 h-12', underscore: 'text-3xl', text: 'text-[32px]', gap: 'gap-3' },
};

/**
 * Glassmorphic Logo — MD3 compliant
 * Uses CSS vars from global.css: --logo-bg, --logo-text, --logo-ambient-reflection
 */
export function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
    const s = sizeMap[size];
    return (
        <div className={cn('flex items-center', s.gap, className)}>
            {/* Badge */}
            <div
                className={cn(
                    'relative flex items-center justify-center rounded-full overflow-hidden',
                    s.badge
                )}
                style={{
                    background: 'var(--logo-bg)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.1)',
                }}
            >
                {/* Ambient reflection */}
                <div
                    className="absolute bottom-0 left-[10px] right-[10px] h-[30%] rounded-full pointer-events-none"
                    style={{ background: 'var(--logo-ambient-reflection)' }}
                />
                <span
                    className={cn('font-extrabold leading-none select-none relative z-[1] -translate-y-[2px]', s.underscore)}
                    style={{ color: 'var(--logo-text)', textShadow: 'var(--logo-text-shadow)' }}
                >
                    _
                </span>
            </div>
            {/* Text */}
            {showText && (
                <span
                    className={cn('font-light tracking-[-0.02em] text-on-surface', s.text)}
                >
                    underscore
                </span>
            )}
        </div>
    );
}
