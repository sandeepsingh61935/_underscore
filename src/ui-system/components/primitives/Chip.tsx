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
    ({ className, variant = 'filter', selected, onRemove, icon, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center gap-2',
                    'text-label-large',
                    'h-[32px] px-4',
                    'transition-all duration-short ease-standard',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',

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
                        'bg-surface-container-high',
                        'text-on-surface',
                        'border border-outline-variant',
                        'hover:bg-surface-container-highest',
                    ],

                    'disabled:opacity-disabled disabled:pointer-events-none',
                    className
                )}
                {...props}
            >
                {icon && <span className="w-[18px] h-[18px] flex items-center justify-center">{icon}</span>}
                {children}
                {variant === 'input' && onRemove && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="w-[18px] h-[18px] flex items-center justify-center hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] rounded-full transition-colors"
                        aria-label="Remove"
                    >
                        <X className="w-[16px] h-[16px]" />
                    </button>
                )}
            </button>
        );
    }
);

Chip.displayName = 'Chip';

export { Chip };
