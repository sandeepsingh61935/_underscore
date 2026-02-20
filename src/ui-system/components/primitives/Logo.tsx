import React from 'react';
import { cn } from '../../utils/cn';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

/**
 * Logo Component
 * Source: /docs/07-design/mode-selection/mode-selection-code.html
 */
export function Logo({ className = '', showText = true }: LogoProps) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className="relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-surface-container-high shadow-inner text-on-surface -mt-0.5">
                <span className="absolute text-2xl md:text-3xl font-extrabold leading-none select-none -translate-y-[2px]">_</span>
            </div>
            {showText && (
                <h1 className="text-on-surface text-3xl md:text-4xl font-light tracking-tight">
                    underscore
                </h1>
            )}
        </div>
    );
}
