import React, { ElementType, HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type TextVariant =
    | 'h1'    // Page Title (3xl/4xl)
    | 'h2'    // Section Title (xl/2xl)
    | 'h3'    // Subsection (lg)
    | 'body'  // Standard text (base)
    | 'small' // Metadata (sm)
    | 'tiny'  // Badges (xs)
    | 'label' // Form labels (sm, medium weight)
    | 'link'; // Interactive text

interface TextProps extends HTMLAttributes<HTMLElement> {
    variant?: TextVariant;
    as?: ElementType;
    muted?: boolean;
}

const Text = forwardRef<HTMLElement, TextProps>(
    ({ className, variant = 'body', as, muted, children, ...props }, ref) => {
        // Default tag mapping
        const Component = as || (
            variant === 'h1' ? 'h1' :
                variant === 'h2' ? 'h2' :
                    variant === 'h3' ? 'h3' :
                        variant === 'label' ? 'label' :
                            'p'
        );

        return (
            <Component
                ref={ref}
                className={cn(
                    'font-display text-on-surface transition-colors',

                    // Variants - now using MD3 typography scale
                    variant === 'h1' && 'text-headline-large',
                    variant === 'h2' && 'text-headline-medium',
                    variant === 'h3' && 'text-title-large',
                    variant === 'body' && 'text-body-large',
                    variant === 'small' && 'text-body-medium',
                    variant === 'tiny' && 'text-label-small',
                    variant === 'label' && 'text-label-medium',
                    variant === 'link' && 'text-label-medium text-primary hover:underline cursor-pointer',

                    // Modifiers
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
