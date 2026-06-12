/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L233-262 (.btn CSS in tokens.css)
 * V2 contract: 4 variants (default/primary/accent/ghost) -> var(--paper) /
 *   var( --rule ) / var( --accent ) / var(--rule-soft) borders.
 *   2 sizes: default (44px) and sm (32px). min-height enforced by .btn CSS.
 *   Loading state: monospace "Loading..." text + disabled.
 */
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
