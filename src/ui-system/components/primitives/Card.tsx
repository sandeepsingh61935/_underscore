/**
 * Material Design 3 Card Component
 * 
 * Implements MD3 card specification with:
 * - Medium rounded corners (12dp)
 * - Surface container background for elevation
 * - Hover state that lifts to surface-container-high
 * - Optional interactive/clickable behavior
 * 
 * @see https://m3.material.io/components/cards/overview
 */

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Makes the card interactive/clickable
     */
    interactive?: boolean;

    /**
     * Adds subtle elevation shadow
     */
    elevated?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, interactive, elevated, children, onClick, ...props }, ref) => {
        return interactive ? (
            <button
                ref={ref as any}
                onClick={onClick}
                className={cn(
                    // MD3 Shape: Medium rounded corners (12dp)
                    'rounded-[var(--md-sys-shape-corner-medium)]',

                    // MD3 Surface: Surface container for default elevation
                    'bg-[var(--md-sys-color-surface-container)]',

                    // MD3 Color: On-surface for text content
                    'text-[var(--md-sys-color-on-surface)]',

                    // Padding for content
                    'p-4',

                    // MD3 Transitions
                    'transition-all duration-[var(--md-sys-motion-duration-medium)] ease-[var(--md-sys-motion-easing-standard)]',

                    // MD3 Elevation: Default shadow level 1, hover to level 2
                    'shadow-elevation-1',
                    'hover:shadow-elevation-2',
                    // Focus ring
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2',
                    // Button reset styles
                    'border-0 text-left w-full',

                    className
                )}
                {...(props as any)}
            >
                {children}
            </button>
        ) : (
            <div
                ref={ref}
                className={cn(
                    // MD3 Shape: Medium rounded corners (12dp)
                    'rounded-[var(--md-sys-shape-corner-medium)]',

                    // MD3 Surface: Surface container for default elevation
                    'bg-[var(--md-sys-color-surface-container)]',

                    // MD3 Color: On-surface for text content
                    'text-[var(--md-sys-color-on-surface)]',

                    // Padding for content
                    'p-4',

                    // MD3 Transitions
                    'transition-all duration-[var(--md-sys-motion-duration-medium)] ease-[var(--md-sys-motion-easing-standard)]',

                    // Elevated variant adds subtle shadow
                    elevated && 'shadow-sm',

                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

/**
 * Card Header - typically contains title and optional action
 */
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'flex items-start justify-between gap-4 mb-3',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card Title - uses MD3 title-medium typography
 */
export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <h3
                ref={ref}
                className={cn(
                    // MD3 Typography: Title Medium
                    'text-[var(--md-sys-typescale-title-medium-size)]',
                    'leading-[var(--md-sys-typescale-title-medium-line-height)]',
                    'font-[var(--md-sys-typescale-title-medium-weight)]',
                    'text-[var(--md-sys-color-on-surface)]',
                    className
                )}
                {...props}
            >
                {children}
            </h3>
        );
    }
);

CardTitle.displayName = 'CardTitle';

/**
 * Card Description - uses MD3 body-medium typography
 */
export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <p
                ref={ref}
                className={cn(
                    // MD3 Typography: Body Medium
                    'text-[var(--md-sys-typescale-body-medium-size)]',
                    'leading-[var(--md-sys-typescale-body-medium-line-height)]',
                    'text-[var(--md-sys-color-on-surface-variant)]',
                    className
                )}
                {...props}
            >
                {children}
            </p>
        );
    }
);

CardDescription.displayName = 'CardDescription';

/**
 * Card Content - main content area
 */
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn('mt-2', className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);

CardContent.displayName = 'CardContent';

/**
 * Card Footer - typically contains actions
 */
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'flex items-center gap-2 mt-4 pt-4 border-t border-[var(--md-sys-color-outline-variant)]',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

CardFooter.displayName = 'CardFooter';

export { Card };
