import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TrustSignalProps {
    className?: string;
}

/**
 * "Your data stays yours — encrypted and private"
 * Subtle reassurance shown on welcome page
 */
export function TrustSignal({ className }: TrustSignalProps) {
    return (
        <p
            className={cn('flex items-center gap-1 text-body-small tracking-wide text-outline', className)}
        >
            <Lock className="inline w-3 h-3" />
            Your data stays yours — encrypted and private
        </p>
    );
}
