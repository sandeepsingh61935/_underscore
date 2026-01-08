import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    // Base styles
                    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-bg-base-light dark:ring-offset-bg-base-dark font-display',

                    // Variants
                    variant === 'primary' &&
                    'bg-primary text-white hover:bg-primary-hover active:bg-primary-active',

                    variant === 'secondary' &&
                    'bg-bg-alt-light dark:bg-bg-alt-dark text-text-primary-light dark:text-text-primary-dark hover:bg-opacity-80',

                    variant === 'ghost' &&
                    'text-text-primary-light dark:text-text-primary-dark hover:bg-bg-alt-light dark:hover:bg-bg-alt-dark',

                    variant === 'destructive' &&
                    'bg-red-500 text-white hover:bg-red-600',

                    variant === 'outline' &&
                    'border border-border-light dark:border-border-dark hover:bg-bg-alt-light dark:hover:bg-bg-alt-dark bg-transparent',

                    // Sizes
                    size === 'sm' && 'h-8 px-3 text-xs',
                    size === 'md' && 'h-10 px-4 py-2',
                    size === 'lg' && 'h-12 px-8 text-lg',
                    size === 'icon' && 'h-10 w-10',

                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
