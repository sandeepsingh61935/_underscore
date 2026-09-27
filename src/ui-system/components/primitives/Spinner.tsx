/**
 * Design contract: src/ui-system/theme/global.css (Spinner section)
 *   - 2px solid ring, border-radius 50%, default border var(--rule-soft),
 *     border-top-color var(--accent) (the rotating edge).
 *   - sm/md/lg sizes (16/24/32).
 *   - role="status", aria-label="Loading" for a11y.
 */
import React from 'react';

import { cn } from '../../utils/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'spinner-sm', md: 'spinner-md', lg: 'spinner-lg' } as const;

/**
 * Border-based spinner — Editorial ring: --rule-soft (soft hairline),
 * rotating top edge: --accent (single terracotta).
 */
export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <div
      className={cn('spinner', sizeMap[size], className)}
      role="status"
      aria-label="Loading"
    />
  );
}
