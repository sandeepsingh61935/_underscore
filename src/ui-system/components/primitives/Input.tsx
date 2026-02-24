/**
 * MD3 Text Field Component
 * @see https://m3.material.io/components/text-fields/overview
 */

import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    helperText?: string;
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
                            'flex w-full',
                            'rounded-md',                                    // 12px
                            'bg-surface-container-highest',
                            'text-body-large',
                            'text-on-surface',
                            'px-4 py-3',
                            'border border-outline',
                            'focus:outline-none focus:ring-0 focus:border-2 focus:border-primary',
                            'transition-all duration-short ease-standard',
                            'min-h-[56px]',                                  // MD3 text field height
                            'placeholder:text-on-surface-variant',
                            'disabled:opacity-disabled disabled:cursor-not-allowed disabled:bg-surface-container-low',
                            error && [
                                'border-error',
                                'focus:border-error',
                                'text-error',
                            ],
                            'file:border-0 file:bg-transparent',
                            'file:text-label-large',
                            'file:font-medium',
                            'file:text-primary',
                            className
                        )}
                        {...props}
                    />
                </div>
                {helperText && (
                    <p className={cn(
                        'mt-1 text-body-small',
                        error ? 'text-error' : 'text-on-surface-variant'
                    )}>
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
