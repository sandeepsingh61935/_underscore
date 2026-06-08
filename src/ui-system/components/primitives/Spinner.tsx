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
