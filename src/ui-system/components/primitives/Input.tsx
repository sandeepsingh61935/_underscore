/**
 * Design contract: src/ui-system/theme/global.css (Input section)
 * 4 states (default/focus/error/disabled), var(--control-h) height,
 * border 1px (var(--rule-soft) default | var(--accent) focus/error),
 * paper fill, radius var(--radius), focus ring var(--accent).
 * Error state uses --accent per single-accent rule.
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
      borderColor: error ? 'var(--accent)' : 'var(--rule-soft)',
      ...style,
    };
    return (
      <div className="input-wrap">
        <div className="input-box">
          <input
            ref={ref}
            placeholder={label || props.placeholder}
            className={cn('input', error && 'is-error', className)}
            style={inputStyle}
            {...props}
          />
        </div>
        {helperText && (
          <p className={cn('input-help', error && 'is-error')}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
