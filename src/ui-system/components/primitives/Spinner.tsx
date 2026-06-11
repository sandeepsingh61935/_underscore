/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L532-546 (V2_Spinner)
 * V2 contract:
 *   - 2px solid ring, border-radius 50%, default border var(--rule-soft),
 *     border-top-color var(--accent) (the rotating edge).
 *   - sm/md/lg sizes from SPINNER_SIZES map (16/24/32 in current impl).
 *   - role="status", aria-label="Loading" for a11y.
 */
import React from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' } as const;

/**
 * Border-based spinner — V2 ring: --rule-soft (soft hairline),
 * rotating top edge: --accent (single terracotta).
 */
export function Spinner({ className, size = 'md' }: SpinnerProps) {
    return (
        <div
            className={cn('rounded-full animate-spin border-2', sizeMap[size], className)}
            style={{
                borderTopColor: 'var(--accent)',
                borderRightColor: 'var(--rule-soft)',
                borderBottomColor: 'var(--rule-soft)',
                borderLeftColor: 'var(--rule-soft)',
            }}
            role="status"
            aria-label="Loading"
        />
    );
}
