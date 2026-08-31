/**
 * Wireframe: ui_kits/extension/v2/tokens.css L329-343 (.u-card-row CSS — list
 *   row pattern with hover state, separate from this surface Card).
 *   The wireframe uses inline-style Cards in screens (e.g. Dialog body, L870
 *   Card title demo). V2 surface contract locked here:
 *     - background: var(--paper-2)
 *     - border: var(--rule-soft) (default) | var( --rule ) (elevated)
 *     - text: var(--ink)
 *     - no box-shadows; padding: 16px (p-4); border-radius: --radius
 *     - interactive -> <button> for click target
 * V2 uses borders for separation (not box-shadows). No spring curve.
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
      backgroundColor: 'var(--paper-2)',
      color: 'var(--ink)',
      border: `1px solid ${elevated ? 'var( --rule )' : 'var(--rule-soft)'}`,
      ...style,
    };

    return interactive ? (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
        style={computedStyle}
        className={cn(
          'rounded p-4 text-left border-0 w-full cursor-pointer',
          'transition-colors',
          'hover:bg-[color-mix(in_oklch,var(--ink)_6%,var(--paper-2))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var( --accent )] focus-visible:ring-offset-2',
          className
        )}
        {...(props as React.HTMLAttributes<HTMLElement>)}
      >
        {children}
      </button>
    ) : (
      <div
        ref={ref}
        style={computedStyle}
        className={cn('rounded p-4', className)}
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
    <div
      ref={ref}
      className={cn('flex items-start justify-between gap-4 mb-3', className)}
      style={{ marginBottom: 12, ...style }}
      {...props}
    >
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
    className={cn('font-serif', className)}
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
    <div ref={ref} className={cn('mt-2', className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2', className)}
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--rule-soft)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';

export { Card };
