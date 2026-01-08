import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    'flex h-10 w-full rounded-md border border-border-light dark:border-border-dark bg-bg-surface-light dark:bg-bg-surface-dark px-3 py-2 text-sm ring-offset-bg-base-light dark:ring-offset-bg-base-dark file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-display text-text-primary-light dark:text-text-primary-dark',
                    error && 'border-red-500 focus-visible:ring-red-500',
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';

export { Input };
