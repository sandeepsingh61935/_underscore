import React, { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'accent' | 'ghost';
    size?: 'default' | 'sm';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'default', size = 'default', isLoading, children, disabled, style, ...props }, ref) => {
        let variantClass = '';
        if (variant === 'primary') variantClass = ' primary';
        if (variant === 'accent') variantClass = ' accent';
        if (variant === 'ghost') variantClass = ' ghost';

        const sizeClass = size === 'sm' ? ' sm' : '';

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`btn${variantClass}${sizeClass} ${className}`.trim()}
                style={style}
                {...props}
            >
                {isLoading ? (
                    <span className="u-mono" style={{ fontSize: 12 }}>Loading...</span>
                ) : children}
            </button>
        );
    }
);

Button.displayName = 'Button';
