/**
 * V2 Chip Component
 * Built on the V2 tonalPill helpers (--rule-soft border, --paper-2 surface,
 * --accent for the selected state). Per V2 spec, touch target is 44px.
 */

import { X } from 'lucide-react';
import React, { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';
import {
    tonalPillActiveClass,
    tonalPillBaseClass,
    tonalPillInactiveClass,
    tonalPillStandaloneClass,
} from '../../utils/tonalPill';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'filter' | 'input';
    selected?: boolean;
    onRemove?: () => void;
    icon?: React.ReactNode;
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
    ({ className, variant = 'filter', selected, onRemove, icon, children, type, onClick, disabled, style, ...props }, ref) => {
        const sharedChipClasses = cn(
            'inline-flex min-h-[44px] items-center justify-center gap-2',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
            'disabled:opacity-50 disabled:pointer-events-none'
        );

        const variantClasses = cn(
            variant === 'filter' && [
                tonalPillBaseClass,
                tonalPillStandaloneClass,
                !selected && [
                    tonalPillInactiveClass,
                    'hover:border-[var(--rule)]',
                ],
                selected && [
                    tonalPillActiveClass,
                ],
            ],

            variant === 'input' && [
                'rounded-full border border-[var(--rule-soft)] bg-[var(--paper-2)] text-[var(--ink)]',
                'hover:bg-[color-mix(in_oklch,var(--ink)_4%,var(--paper-2))]',
            ]
        );

        if (variant === 'input' && onRemove) {
            return (
                <div
                    className={cn(sharedChipClasses, variantClasses, 'w-fit pl-4 pr-1', className)}
                    style={style}
                >
                    {icon && <span className="flex h-[18px] w-[18px] items-center justify-center">{icon}</span>}
                    <button
                        ref={ref}
                        type={type ?? 'button'}
                        onClick={onClick}
                        disabled={disabled}
                        className="min-h-[44px] min-w-0 flex-1 rounded-full bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                        {...props}
                    >
                        {children}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        disabled={disabled}
                        className={cn(
                            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full',
                            'text-[var(--ink-2)] transition-colors',
                            'hover:bg-[color-mix(in_oklch,var(--ink)_8%,transparent)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
                            'disabled:opacity-50 disabled:pointer-events-none'
                        )}
                        aria-label="Remove"
                    >
                        <X className="h-[16px] w-[16px]" />
                    </button>
                </div>
            );
        }

        return (
            <button
                ref={ref}
                type={type ?? 'button'}
                onClick={onClick}
                disabled={disabled}
                className={cn(
                    sharedChipClasses,
                    variantClasses,
                    'px-4',
                    className
                )}
                style={{ fontSize: 'var(--step-0)', ...style }}
                {...props}
            >
                {icon && <span className="flex h-[18px] w-[18px] items-center justify-center">{icon}</span>}
                {children}
            </button>
        );
    }
);

Chip.displayName = 'Chip';

export { Chip };
