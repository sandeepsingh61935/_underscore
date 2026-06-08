import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TrustSignalProps {
    className?: string;
}

/**
 * "Your data stays yours — encrypted and private"
 * Subtle reassurance shown on welcome page.
 * V2: text color --ink-3 (muted), font-size --step--1, mono-tracked.
 */
export function TrustSignal({ className }: TrustSignalProps) {
    return (
        <p
            className={cn('flex items-center gap-1', className)}
            style={{
                color: 'var(--ink-3)',
                fontSize: 'var(--step--1)',
                letterSpacing: '0.02em',
            }}
        >
            <Lock className="inline w-3 h-3" aria-hidden="true" />
            Your data stays yours — encrypted and private
        </p>
    );
}
