import type { ElementType, HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';

import { cn } from '../../utils/cn';

export type TextVariant =
  | 'displayLarge'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall'
  | 'h1' // Headline Large (32px)
  | 'h2' // Headline Medium (28px)
  | 'h3' // Title Large (22px)
  | 'body' // Body Large (16px)
  | 'small' // Body Medium (14px)
  | 'tiny' // Label Small (11px)
  | 'label' // Label Medium (12px)
  | 'link'; // Interactive text

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: ElementType;
  muted?: boolean;
}

const variantClassMap: Record<TextVariant, string> = {
  displayLarge: 'text-display-large',
  displaySmall: 'text-display-small',
  headlineLarge: 'text-headline-large',
  headlineMedium: 'text-headline-medium',
  headlineSmall: 'text-headline-small',
  titleLarge: 'text-title-large',
  titleMedium: 'text-title-medium',
  titleSmall: 'text-title-small',
  bodyLarge: 'text-body-large',
  bodyMedium: 'text-body-medium',
  bodySmall: 'text-body-small',
  labelLarge: 'text-label-large',
  labelMedium: 'text-label-medium',
  labelSmall: 'text-label-small',
  h1: 'text-headline-large',
  h2: 'text-headline-medium',
  h3: 'text-title-large',
  body: 'text-body-large',
  small: 'text-body-medium',
  tiny: 'text-label-small',
  label: 'text-label-medium',
  link: 'text-label-medium text-primary hover:underline cursor-pointer',
};

const semanticTagMap: Partial<Record<TextVariant, ElementType>> = {
  displayLarge: 'h1',
  displaySmall: 'h1',
  headlineLarge: 'h1',
  headlineMedium: 'h1',
  headlineSmall: 'h1',
  h1: 'h1',
  h2: 'h2',
  titleLarge: 'h2',
  titleMedium: 'h3',
  titleSmall: 'h3',
  h3: 'h2',
  labelMedium: 'label',
  label: 'label',
};

const Text = forwardRef<HTMLElement, TextProps>(
  ({ className, variant = 'body', as, muted, children, ...props }, ref) => {
    const Component = as || semanticTagMap[variant] || 'p';

    return (
      <Component
        ref={ref}
        className={cn(
          'font-display text-on-surface transition-colors',
          variantClassMap[variant],
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
