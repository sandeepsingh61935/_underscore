/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L1019-1037 (V2_Text)
 * V2 contract:
 *   - step + family params map to size + u-serif|u-sans|u-mono class.
 *   - 9 step-scale sizes; families sans/serif/mono.
 *
 * Note: current impl uses variant-based step map (MD3-style ramp) but
 * routes to V2 step tokens. No family prop is exposed yet; family-class
 * routing is a future cycle. Tests lock what the public contract exposes.
 */
import type { CSSProperties, ElementType, HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';

import { cn } from '../../utils/cn';

export type TextVariant =
  | 'displayLarge'   // --step-6 (48px)
  | 'displaySmall'   // --step-5 (36px)
  | 'headlineLarge'  // --step-5 (36px)
  | 'headlineMedium' // --step-4 (28px)
  | 'headlineSmall'  // --step-3 (22px)
  | 'titleLarge'     // --step-3 (22px)
  | 'titleMedium'    // --step-2 (18px)
  | 'titleSmall'     // --step-1 (15px)
  | 'bodyLarge'      // --step-1 (15px)
  | 'bodyMedium'     // --step-0 (13px)
  | 'bodySmall'      // --step--1 (11px)
  | 'labelLarge'     // --step-0 (13px)
  | 'labelMedium'    // --step--1 (11px)
  | 'labelSmall'     // --step--2 (10px)
  | 'h1'             // --step-5
  | 'h2'             // --step-4
  | 'h3'             // --step-3
  | 'body'           // --step-0
  | 'small'          // --step--1
  | 'tiny'           // --step--1
  | 'label'          // --step--1
  | 'link';          // --step--1 + ink color

interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: ElementType;
  muted?: boolean;
}

/**
 * V2 step scale. Maps the legacy MD3 type-scale variants to V2 --step-*
 * tokens (10/11/13/15/18/22/28/36/48). The step scale is intentionally
 * smaller than MD3's 13-variant scale — V2 favors fewer, larger jumps.
 */
const variantStepMap: Record<TextVariant, string> = {
  displayLarge:  'var(--step-6)',
  displaySmall:  'var(--step-5)',
  headlineLarge: 'var(--step-5)',
  headlineMedium: 'var(--step-4)',
  headlineSmall: 'var(--step-3)',
  titleLarge:    'var(--step-3)',
  titleMedium:   'var(--step-2)',
  titleSmall:    'var(--step-1)',
  bodyLarge:     'var(--step-1)',
  bodyMedium:    'var(--step-0)',
  bodySmall:     'var(--step--1)',
  labelLarge:    'var(--step-0)',
  labelMedium:   'var(--step--1)',
  labelSmall:    'var(--step--2)',
  h1:            'var(--step-5)',
  h2:            'var(--step-4)',
  h3:            'var(--step-3)',
  body:          'var(--step-0)',
  small:         'var(--step--1)',
  tiny:          'var(--step--1)',
  label:         'var(--step--1)',
  link:          'var(--step--1)',
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
};

const Text = forwardRef<HTMLElement, TextProps>(
  ({ className, variant = 'body', as, muted, style, children, ...props }, ref) => {
    const Component = as || semanticTagMap[variant] || 'p';

    const isLink = variant === 'link';
    const colorVar = muted ? 'var( --ink-3 )' : isLink ? 'var( --accent )' : 'var(--ink)';

    const computedStyle: CSSProperties = {
      color: colorVar,
      fontSize: variantStepMap[variant],
      ...style,
    };

    return (
      <Component
        ref={ref}
        className={cn(
          'font-serif',
          isLink && 'cursor-pointer hover:underline',
          className,
        )}
        style={computedStyle}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Text.displayName = 'Text';

export { Text };
