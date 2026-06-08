/**
 * V2 Text Field Component
 * Border uses --rule (focus: --accent), text --ink, font-size --step-0.
 * Error state uses --accent per V2 single-accent rule.
 */

import React, { forwardRef } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    helperText?: string;
    label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, helperText, label, style, ...props }, ref) => {
        const inputStyle: CSSProperties = {
            color: 'var(--ink)',
            fontSize: 'var(--step-0)',
            borderColor: error ? 'var(--accent)' : 'var(--rule)',
            ...style,
        };
        return (
            <div className="w-full">
                <div className="relative">
                    <input
                        ref={ref}
                        placeholder={label || props.placeholder}
                        className={cn(
                            'flex w-full rounded-md px-4 py-3',
                            'border bg-transparent',
                            'min-h-[44px]',
                            'placeholder:opacity-60',
                            'transition-colors',
                            'focus:outline-none focus:border-[var(--accent)]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            className
                        )}
                        style={inputStyle}
                        {...props}
                    />
                </div>
                {helperText && (
                    <p
                        className="mt-1"
                        style={{
                            color: error ? 'var(--accent)' : 'var(--ink-3)',
                            fontSize: 'var(--step--1)',
                        }}
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
