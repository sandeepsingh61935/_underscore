import React from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

/**
 * Border-based spinner, accent top color — matches Style C mockups
 */
export function Spinner({ className, size = 'md' }: SpinnerProps) {
    return (
        <div
            className={cn('rounded-full animate-spin', sizeMap[size], className)}
            style={{
                border: '2px solid var(--border)',
                borderTopColor: 'var(--accent)',
            }}
        />
    );
}
