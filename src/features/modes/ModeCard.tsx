import React from 'react';
import { Lock, ArrowRight } from 'lucide-react';
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
 * Mode selection card — interactive card with name, description, and lock state.
 * Uses MD3 semantic tokens and Tailwind-only hover/disabled states.
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
                'group w-full text-left rounded-md px-3.5 py-2.5 border',
                'shadow-elevation-1 transition-all duration-short ease-standard',
                'hover:shadow-elevation-3 hover:-translate-y-0.5 hover:border-outline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'disabled:opacity-disabled disabled:pointer-events-none disabled:cursor-not-allowed',
                active
                    ? 'bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)] border-primary'
                    : 'bg-surface-container-lowest border-outline-variant',
                className
            )}
        >
            {/* Content — flex-row for right-side arrow/lock */}
            <div className="w-full flex items-center justify-between">
                <div className="flex flex-col gap-1 text-left">
                    <span
                        className={cn(
                            'text-label-large tracking-tight transition-colors duration-short ease-standard',
                            active ? 'text-primary' : 'text-on-surface'
                        )}
                    >
                        {name}
                    </span>
                    <p className="text-label-small leading-tight text-outline">
                        {description}
                    </p>
                </div>

                {/* Right side icon */}
                {locked ? (
                    <span className="text-outline">
                        <Lock className="w-4 h-4" />
                    </span>
                ) : (
                    <span
                        className="text-primary opacity-0 group-hover:opacity-100 transition-all duration-short ease-standard group-hover:translate-x-1"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </span>
                )}
            </div>
        </button>
    );
}
