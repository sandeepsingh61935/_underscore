import React from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

/**
 * Border-based spinner — MD3 border spinner with primary accent
 */
export function Spinner({ className, size = 'md' }: SpinnerProps) {
    return (
        <div
            className={cn(
                'rounded-full animate-spin',
                'border-2 border-outline-variant border-t-primary',
                sizeMap[size],
                className
            )}
        />
    );
}
