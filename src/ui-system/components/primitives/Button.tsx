/**
 * Material Design 3 Button Component
 * 
 * Implements MD3 button specifications with three variants:
 * - filled: High-emphasis primary actions
 * - outlined: Medium-emphasis secondary actions  
 * - text: Low-emphasis tertiary actions
 * 
 * @see https://m3.material.io/components/buttons/overview
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Visual style following MD3 button types
     * - filled: Primary actions (high emphasis)
     * - outlined: Secondary actions (medium emphasis)
     * - text: Tertiary actions (low emphasis)
     */
    variant?: 'filled' | 'outlined' | 'text';

    /**
     * Loading state - shows spinner
     */
    isLoading?: boolean;

    /**
     * Icon to display before text
     */
    icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'filled', isLoading, icon, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    // Base styles - MD3 specifications
                    'inline-flex items-center justify-center gap-2',

                    // MD3 Shape: Full rounded (pill shape)
                    'rounded-full',

                    // MD3 Typography: Label Large (14px, medium weight)
                    'text-[var(--md-sys-typescale-label-large-size)]',
                    'leading-[var(--md-sys-typescale-label-large-line-height)]',
                    'font-[var(--md-sys-typescale-label-large-weight)]',

                    // MD3 Minimum touch target: 48dp height
                    'min-h-[48px] px-6',

                    // Transitions using MD3 motion tokens
                    'transition-all duration-[var(--md-sys-motion-duration-short)] ease-[var(--md-sys-motion-easing-standard)]',

                    // Focus ring using primary color
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2',

                    // Disabled state - MD3 spec 38% opacity
                    'disabled:opacity-disabled disabled:pointer-events-none',

                    // Variant: Filled Button
                    variant === 'filled' && [
                        'bg-[var(--md-sys-color-primary)]',
                        'text-[var(--md-sys-color-on-primary)]',
                        // State layer on hover (8% opacity overlay)
                        'hover:shadow-[inset_0_0_0_100vmax_rgba(255,255,255,0.08)]',
                        // State layer on active (12% opacity overlay)
                        'active:shadow-[inset_0_0_0_100vmax_rgba(255,255,255,0.12)]',
                        // Subtle elevation shadow
                        'shadow-sm',
                    ],

                    // Variant: Outlined Button
                    variant === 'outlined' && [
                        'bg-transparent',
                        'text-[var(--md-sys-color-primary)]',
                        'border border-[var(--md-sys-color-outline)]',
                        // State layer on hover
                        'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]',
                        // State layer on active
                        'active:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]',
                    ],

                    // Variant: Text Button
                    variant === 'text' && [
                        'bg-transparent',
                        'text-[var(--md-sys-color-primary)]',
                        // State layer on hover
                        'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]',
                        // State layer on active
                        'active:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]',
                        // No border
                        'px-4', // Less horizontal padding for text buttons
                    ],

                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
                {!isLoading && icon && <span className="h-[18px] w-[18px] flex items-center justify-center">{icon}</span>}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
