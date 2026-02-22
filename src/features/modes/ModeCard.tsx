import React from 'react';
import { cn } from '@/ui-system/utils/cn';

interface ModeCardProps {
    name: string;
    description: string;
    hint: string;
    locked?: boolean;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}

/**
 * Mode selection card — glassmorphic card with name, description, hint, and lock state
 * Matches the Style C Hybrid mode selection mockup
 */
export function ModeCard({
    name,
    description,
    hint: _hint,
    locked = false,
    active = false,
    onClick,
    className,
}: ModeCardProps) {
    return (
        <button
            type="button"
            onClick={locked ? undefined : onClick}
            disabled={locked}
            className={cn(
                'w-full text-left rounded-[var(--radius)] transition-all duration-150 relative overflow-hidden',
                'disabled:cursor-not-allowed',
                className
            )}
            style={{
                padding: '10px 14px',
                background: active ? 'var(--accent-soft)' : 'var(--bg-card)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                opacity: locked ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
                if (!locked) {
                    e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                }
            }}
            onMouseLeave={(e) => {
                if (!locked) {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = active ? 'var(--accent)' : 'var(--border)';
                }
            }}
        >
            {/* Glass reflection */}
            <div
                className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none"
                style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
                }}
            />
            <div className="dark:hidden absolute top-0 left-0 right-0 h-[45%] pointer-events-none" style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 100%)',
            }} />

            {/* Content properly aligned as flex-row for right-side arrow/lock */}
            <div className="relative z-[1] w-full flex items-center justify-between">
                <div className="flex flex-col gap-1 text-left">
                    <span
                        className="text-[14px] font-medium tracking-tight transition-colors duration-150 group-hover:text-[var(--accent-text)]"
                        style={{ color: active ? 'var(--accent-text)' : 'var(--text-primary)' }}
                    >
                        {name}
                    </span>
                    <p className="text-[11px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                        {description}
                    </p>
                </div>

                {/* Right side icon */}
                {locked ? (
                    <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                        🔒
                    </span>
                ) : (
                    <span
                        className="text-[18px] opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1"
                        style={{ color: 'var(--accent)' }}
                    >
                        →
                    </span>
                )}
            </div>
        </button>
    );
}
