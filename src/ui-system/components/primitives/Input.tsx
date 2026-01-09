/**
 * Material Design 3 Text Field Component
 * 
 * Implements MD3 outlined text field specification with:
 * - Outlined container with rounded corners
 * - Primary color focus state
 * - Error state support
 * - Proper typography (body-large)
 * 
 * @see https://m3.material.io/components/text-fields/overview
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    /**
     * Error state - changes border to error color
     */
    error?: boolean;

    /**
     * Helper text to display below input
     */
    helperText?: string;

    /**
     * Label for the input (appears as placeholder)
     */
    label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, helperText, label, ...props }, ref) => {
        return (
            <div className="w-full">
                <div className="relative">
                    <input
                        ref={ref}
                        placeholder={label || props.placeholder}
                        className={cn(
                            // MD3 Base styles
                            'flex w-full',

                            // MD3 Shape: Medium rounded corners (12dp)
                            'rounded-[var(--md-sys-shape-corner-medium)]',

                            // MD3 Surface: Surface container for input background
                            'bg-[var(--md-sys-color-surface-container-highest)]',

                            // MD3 Typography: Body Large (16px)
                            'text-[var(--md-sys-typescale-body-large-size)]',
                            'leading-[var(--md-sys-typescale-body-large-line-height)]',

                            // MD3 Color: On-surface for text
                            'text-[var(--md-sys-color-on-surface)]',

                            // Padding for comfortable input area
                            'px-4 py-3',

                            // MD3 Outline: Default outline color
                            'border border-[var(--md-sys-color-outline)]',

                            // MD3 Focus state: Primary color outline with increased width
                            'focus:outline-none focus:ring-0 focus:border-2 focus:border-[var(--md-sys-color-primary)]',

                            // MD3 Transitions
                            'transition-all duration-[var(--md-sys-motion-duration-short)] ease-[var(--md-sys-motion-easing-standard)]',

                            // Minimum height for touch target (MD3 recommends 48dp for interactive elements)
                            'min-h-[56px]',

                            // Placeholder styling
                            'placeholder:text-[var(--md-sys-color-on-surface-variant)]',

                            // Disabled state
                            'disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[var(--md-sys-color-surface-container-low)]',

                            // Error state
                            error && [
                                'border-[var(--md-sys-color-error)]',
                                'focus:border-[var(--md-sys-color-error)]',
                                'text-[var(--md-sys-color-error)]',
                            ],

                            // File input specific styles
                            'file:border-0 file:bg-transparent',
                            'file:text-[var(--md-sys-typescale-label-large-size)]',
                            'file:font-[var(--md-sys-typescale-label-large-weight)]',
                            'file:text-[var(--md-sys-color-primary)]',

                            className
                        )}
                        {...props}
                    />
                </div>

                {/* Helper text or error message */}
                {helperText && (
                    <p
                        className={cn(
                            'mt-1 text-[var(--md-sys-typescale-body-small-size)] leading-[var(--md-sys-typescale-body-small-line-height)]',
                            error
                                ? 'text-[var(--md-sys-color-error)]'
                                : 'text-[var(--md-sys-color-on-surface-variant)]'
                        )}
                    >
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
