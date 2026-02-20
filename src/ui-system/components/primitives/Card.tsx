/**
 * MD3 Card Component
 *
 * @see https://m3.material.io/components/cards/overview
 */

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    elevated?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, interactive, elevated, children, onClick, ...props }, ref) => {
        const baseClasses = cn(
            'rounded-md',                    // 12px
            'bg-surface-container',
            'text-on-surface',
            'p-4',
            'transition-all duration-short ease-standard',
            elevated ? 'shadow-elevation-2' : 'shadow-elevation-1',
            className
        );

        return interactive ? (
            <button
                ref={ref as any}
                onClick={onClick}
                className={cn(
                    baseClasses,
                    'hover:shadow-elevation-3',
                    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,var(--md-sys-color-surface-container))]',
                    'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_12%,var(--md-sys-color-surface-container))]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    'border-0 text-left w-full',
                )}
                {...(props as any)}
            >
                {children}
            </button>
        ) : (
            <div ref={ref} className={baseClasses} {...props}>
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => (
        <div ref={ref} className={cn('flex items-start justify-between gap-4 mb-3', className)} {...props}>
            {children}
        </div>
    )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, children, ...props }, ref) => (
        <h3 ref={ref} className={cn('text-title-medium text-on-surface', className)} {...props}>
            {children}
        </h3>
    )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, children, ...props }, ref) => (
        <p ref={ref} className={cn('text-body-medium text-on-surface-variant', className)} {...props}>
            {children}
        </p>
    )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => (
        <div ref={ref} className={cn('mt-2', className)} {...props}>{children}</div>
    )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => (
        <div ref={ref} className={cn('flex items-center gap-2 mt-4 pt-4 border-t border-outline-variant', className)} {...props}>
            {children}
        </div>
    )
);
CardFooter.displayName = 'CardFooter';

export { Card };
