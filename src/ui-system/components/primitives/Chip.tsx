/**
 * Design contract: src/ui-system/theme/global.css (Chip section)
 *   - filter variant: 44px tall, --radius, --paper-2 surface,
 *     --rule-soft border default, --accent border+text when selected.
 *   - input variant: pill, --paper-2 surface, --rule-soft border,
 *     trailing × button when onRemove set.
 */

import { X } from 'lucide-react';
import React, { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filter' | 'input';
  selected?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      className,
      variant = 'filter',
      selected,
      onRemove,
      icon,
      children,
      type,
      onClick,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    if (variant === 'input' && onRemove) {
      return (
        <div className={cn('chip-input-wrap', className)} style={style}>
          {icon && <span className="chip-icon">{icon}</span>}
          <button
            ref={ref}
            type={type ?? 'button'}
            onClick={onClick}
            disabled={disabled}
            className="chip-input-main"
            {...props}
          >
            {children}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled}
            className="chip-remove"
            aria-label="Remove"
          >
            <X aria-hidden="true" />
          </button>
        </div>
      );
    }

    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'chip',
          variant === 'filter' && 'chip-filter',
          variant === 'input' && 'chip-input',
          selected && 'is-selected',
          className
        )}
        style={style}
        aria-pressed={selected}
        {...props}
      >
        {icon && <span className="chip-icon">{icon}</span>}
        {children}
      </button>
    );
  }
);

Chip.displayName = 'Chip';

export { Chip };
