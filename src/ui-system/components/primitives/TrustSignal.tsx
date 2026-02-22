import React from 'react';
import { cn } from '../../utils/cn';

interface TrustSignalProps {
    className?: string;
}

/**
 * "🔒 Your data stays yours — encrypted and private"
 * Subtle reassurance shown on welcome page
 */
export function TrustSignal({ className }: TrustSignalProps) {
    return (
        <p
            className={cn('text-[13px] tracking-wide', className)}
            style={{ color: 'var(--text-tertiary)' }}
        >
            🔒 Your data stays yours — encrypted and private
        </p>
    );
}
