import { Archive, Brain, Circle, Zap } from 'lucide-react';
import React from 'react';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { cn } from '@/ui-system/utils/cn';

interface ModeCardProps {
    id: ModeType;
    name: string;
    description: string;
    hint: string;
    locked?: boolean;
    active?: boolean;
    onClick?: () => void;
    className?: string;
}

const MODE_ICONS: Record<ModeType, React.ReactNode> = {
    walk:   <Circle size={14} />,
    sprint: <Zap size={14} />,
    vault:  <Archive size={14} />,
    neural: <Brain size={14} />,
};

/**
 * Mode selection card — Ink & Glass reskin (B6).
 * Uses data-mode attribute for per-mode CSS --c color binding.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- JSX return type inferred
export function ModeCard({
    id,
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
            data-mode={id}
            className={cn(
                // Base
                'group relative w-full text-left rounded-[16px] border p-4',
                'overflow-hidden cursor-pointer',
                'transition-[transform,border-color,box-shadow,background] duration-[280ms]',
                // Default state
                'border-outline-variant bg-surface-container-lowest shadow-elevation-1',
                // Hover (not locked)
                'hover:-translate-y-[2px] hover:scale-[1.015]',
                'hover:shadow-elevation-2',
                // Active state
                active && 'border-[color-mix(in_srgb,var(--c)_50%,transparent)] bg-[color-mix(in_srgb,var(--c)_7%,var(--md-sys-color-surface-container-lowest))]',
                // Locked
                locked && 'opacity-40 cursor-not-allowed pointer-events-none',
                className
            )}
            style={{ transitionTimingFunction: 'var(--ink-ease-spring)' }}
        >
            {/* Radial glow overlay — visible on hover (and always on active) */}
            <div className={cn(
                'absolute inset-0 pointer-events-none transition-opacity duration-[300ms]',
                'bg-[radial-gradient(ellipse_at_75%_25%,color-mix(in_srgb,var(--c)_14%,transparent),transparent_55%)]',
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )} />

            {/* Card content */}
            <div className="relative z-10 flex flex-col gap-3">
                {/* Top row: icon + badge */}
                <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[14px] bg-[color-mix(in_srgb,var(--c)_14%,transparent)] text-[var(--c)]">
                        {MODE_ICONS[id]}
                    </div>
                    <span className={cn(
                        'text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-[3px] rounded-full',
                        'bg-[color-mix(in_srgb,var(--c)_12%,transparent)]',
                        'border border-[color-mix(in_srgb,var(--c)_25%,transparent)]',
                        'text-[var(--c)]',
                    )}>
                        {locked ? 'Sign in' : active ? 'Active' : 'Free'}
                    </span>
                </div>

                {/* Labels */}
                <div>
                    <p className={cn(
                        'text-[15px] font-semibold tracking-[-0.01em] mb-1',
                        active ? 'text-[var(--c)]' : 'text-on-surface',
                    )}>
                        {name}
                    </p>
                    <p className="text-[11px] text-on-surface-variant leading-[1.45]">
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
}
