/**
 * Material Design 3 Chip Component
 * 
 * Implements MD3 chip specifications with two variants:
 * - filter: For filtering content (toggleable)
 * - input: For user input/tags (with remove action)
 * 
 * @see https://m3.material.io/components/chips/overview
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Chip variant
     * - filter: Toggleable filter chips
     * - input: Input chips with close button
     */
    variant?: 'filter' | 'input';

    /**
     * Selected state (for filter chips)
     */
    selected?: boolean;

    /**
     * Show close/remove icon (for input chips)
     */
    onRemove?: () => void;

    /**
     * Icon to display before label
     */
    icon?: React.ReactNode;
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
    ({ className, variant = 'filter', selected, onRemove, icon, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    // Base styles
                    'inline-flex items-center justify-center gap-2',

                    // MD3 Shape: Small rounded (8dp)
                    'rounded-sm',

                    // MD3 Typography: Label Large
                    'text-label-large',

                    // Height and padding
                    'h-[32px] px-4',

                    // MD3 Transitions
                    'transition-all duration-short ease-standard',

                    // Focus ring
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',

                    // Filter chip styles
                    variant === 'filter' && [
                        !selected && [
                            'bg-transparent',
                            'border border-outline',
                            'text-on-surface-variant',
                            'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface-variant)_8%,transparent)]',
                        ],
                        selected && [
                            'bg-secondary-container',
                            'text-on-secondary-container',
                            'border-none',
                            'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-secondary-container)_8%,var(--md-sys-color-secondary-container))]',
                        ],
                    ],

                    // Input chip styles
                    variant === 'input' && [
                        'bg-surface-container-high',
                        'text-on-surface',
                        'border border-outline-variant',
                        'hover:bg-surface-container-highest',
                    ],

                    // Disabled state
                    'disabled:opacity-40 disabled:pointer-events-none',

                    className
                )}
                {...props}
            >
                {icon && <span className="w-[18px] h-[18px] flex items-center justify-center">{icon}</span>}
                {children}
                {variant === 'input' && onRemove && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
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
