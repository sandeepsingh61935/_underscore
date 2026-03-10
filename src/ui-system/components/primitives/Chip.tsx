/**
 * MD3 Chip Component
 * @see https://m3.material.io/components/chips/overview
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
    ({ className, variant = 'filter', selected, onRemove, icon, children, type, onClick, disabled, ...props }, ref) => {
        const sharedChipClasses = cn(
            'inline-flex min-h-[48px] items-center justify-center gap-2',
            'text-label-large',
            'transition-all duration-short ease-standard',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'disabled:opacity-disabled disabled:pointer-events-none'
        );

        const variantClasses = cn(
            variant === 'filter' && [
                tonalPillBaseClass,
                tonalPillStandaloneClass,
                !selected && [
                    tonalPillInactiveClass,
                    'hover:border-outline',
                ],
                selected && [
                    tonalPillActiveClass,
                    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary-container)_8%,var(--md-sys-color-primary-container))]',
                ],
            ],

            variant === 'input' && [
                'rounded-full border border-outline-variant bg-surface-container-high text-on-surface',
                'hover:bg-surface-container-highest',
            ]
        );

        if (variant === 'input' && onRemove) {
            return (
                <div className={cn(sharedChipClasses, variantClasses, 'w-fit pl-4 pr-1', className)}>
                    {icon && <span className="flex h-[18px] w-[18px] items-center justify-center">{icon}</span>}
                    <button
                        ref={ref}
                        type={type ?? 'button'}
                        onClick={onClick}
                        disabled={disabled}
                        className="min-h-[48px] min-w-0 flex-1 rounded-full bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        {...props}
                    >
                        {children}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        disabled={disabled}
                        className={cn(
                            'inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full',
                            'text-on-surface-variant transition-colors duration-short ease-standard',
                            'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                            'disabled:opacity-disabled disabled:pointer-events-none'
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
