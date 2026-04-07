/**
 * MD3 Button Component
 *
 * Variants: filled, outlined, text
 * Uses MD3 design tokens: primary colors, label-large typography,
 * corner-full shape, state layers on hover/focus/press.
 *
 * @see https://m3.material.io/components/buttons/overview
 */

import { Loader2 } from 'lucide-react';
import React, { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'filled' | 'outlined' | 'text';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'filled', isLoading, icon, children, disabled, style, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                style={{ transitionTimingFunction: 'var(--ink-ease-spring)', ...style }}
                className={cn(
                    // Base
                    'inline-flex items-center justify-center gap-2',

                    // MD3 Shape: Full rounded (pill)
                    'rounded-full',

                    // MD3 Typography: Label Large (14px, 500)
                    'text-label-large',

                    // MD3 Minimum touch target: 48px height
                    'min-h-[48px] px-6',

                    // MD3 Motion
                    'transition-all duration-[220ms]',

                    // Focus ring
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',

                    // MD3 Disabled: 38% opacity
                    'disabled:opacity-disabled disabled:pointer-events-none',

                    // Variant: Filled
                    variant === 'filled' && [
                        'bg-primary',
                        'text-on-primary',
                        'shadow-elevation-1',
                        'hover:shadow-elevation-mode',
                        'hover:-translate-y-[1px]',
                        'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_8%,var(--md-sys-color-primary))]',
                        'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_12%,var(--md-sys-color-primary))]',
                        'active:translate-y-0 active:shadow-elevation-1',
                    ],

                    // Variant: Outlined
                    variant === 'outlined' && [
                        'bg-transparent',
                        'text-primary',
                        'border border-outline-variant',
                        'hover:border-outline',
                        'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]',
                        'active:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]',
                    ],

                    // Variant: Text
                    variant === 'text' && [
                        'bg-transparent',
                        'text-primary',
                        'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]',
                        'active:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]',
                        'px-3',
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
