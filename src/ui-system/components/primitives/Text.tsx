import React, { ElementType, HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type TextVariant =
    | 'h1'    // Headline Large (32px)
    | 'h2'    // Headline Medium (28px)
    | 'h3'    // Title Large (22px)
    | 'body'  // Body Large (16px)
    | 'small' // Body Medium (14px)
    | 'tiny'  // Label Small (11px)
    | 'label' // Label Medium (12px)
    | 'link'; // Interactive text

interface TextProps extends HTMLAttributes<HTMLElement> {
    variant?: TextVariant;
    as?: ElementType;
    muted?: boolean;
}

const Text = forwardRef<HTMLElement, TextProps>(
    ({ className, variant = 'body', as, muted, children, ...props }, ref) => {
        const Component = as || (
            variant === 'h1' ? 'h1' :
                variant === 'h2' ? 'h2' :
                    variant === 'h3' ? 'h3' :
                        variant === 'label' ? 'label' : 'p'
        );

        return (
            <Component
                ref={ref}
                className={cn(
                    'font-display text-on-surface transition-colors',
                    variant === 'h1' && 'text-headline-large',
                    variant === 'h2' && 'text-headline-medium',
                    variant === 'h3' && 'text-title-large',
                    variant === 'body' && 'text-body-large',
                    variant === 'small' && 'text-body-medium',
                    variant === 'tiny' && 'text-label-small',
                    variant === 'label' && 'text-label-medium',
                    variant === 'link' && 'text-label-medium text-primary hover:underline cursor-pointer',
                    muted && 'text-on-surface-variant',
                    className
                )}
                {...props}
            >
                {children}
            </Component>
        );
    }
);

Text.displayName = 'Text';

export { Text };
