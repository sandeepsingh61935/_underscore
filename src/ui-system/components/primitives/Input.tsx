/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L827-850 (V2_Input)
 * V2 contract: 4 states (default/focus/error/disabled), 44px height,
 *   border 1px (var(--rule-soft) default | var(--accent) focus/error),
 *   paper fill, radius var(--radius), focus ring var(--accent).
 *   Error state uses --accent per V2 single-accent rule.
 */

import React, { forwardRef } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, label, style, ...props }, ref) => {
    const inputStyle: CSSProperties = {
      color: 'var(--ink)',
      fontSize: 'var(--step-0)',
      borderColor: error ? 'var(--accent)' : 'var(--rule-soft)',
      backgroundColor: 'var(--paper)',
      borderRadius: 'var(--radius)',
      borderWidth: 1,
      borderStyle: 'solid',
      minHeight: 44,
      padding: '10px 12px',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--sans)',
      ...style,
    };
    return (
      <div style={{ width: '100%' }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={ref}
            placeholder={label || props.placeholder}
            className={cn(
              'placeholder:opacity-60',
              'transition-colors',
              'focus:outline-none focus:border-[var(--accent)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className
            )}
            style={inputStyle}
            {...props}
          />
        </div>
        {helperText && (
          <p
            style={{
              marginTop: 4,
              color: error ? 'var(--accent)' : 'var(--ink-3)',
              fontSize: 'var(--step--1)',
            }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
