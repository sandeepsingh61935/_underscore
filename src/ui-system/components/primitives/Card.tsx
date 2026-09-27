/**
 * Design contract: src/ui-system/theme/global.css (Card section)
 *   - background: var(--paper-2)
 *   - border: var(--rule-soft) (default) | var(--rule) (elevated)
 *   - text: var(--ink)
 *   - no box-shadows; padding: var(--type-inset-padding); radius: var(--radius)
 *   - interactive -> <button> for click target
 * Editorial uses borders for separation (not box-shadows). No spring curve.
 */

import React, { type CSSProperties, type HTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  elevated?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, elevated, children, onClick, style, ...props }, ref) => {
    const computedStyle: CSSProperties = {
      border: `1px solid ${elevated ? 'var(--rule)' : 'var(--rule-soft)'}`,
      ...style,
    };

    return interactive ? (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
        style={computedStyle}
        className={cn('card-interactive', className)}
        {...(props as React.HTMLAttributes<HTMLElement>)}
      >
        {children}
      </button>
    ) : (
      <div
        ref={ref}
        style={computedStyle}
        className={cn('card', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, ref) => (
    <div ref={ref} className={cn('card-header', className)} style={style} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, children, style, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('u-serif', className)}
    style={{ color: 'var(--ink)', fontSize: 'var(--step-2)', ...style }}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, children, style, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(className)}
    style={{ color: 'var(--ink-2)', fontSize: 'var(--step-0)', ...style }}
    {...props}
  >
    {children}
  </p>
));
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('card-content', className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, ref) => (
    <div ref={ref} className={cn('card-footer', className)} style={style} {...props}>
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export { Card };
