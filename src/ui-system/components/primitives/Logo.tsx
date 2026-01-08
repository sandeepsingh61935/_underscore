import React from 'react';
import { cn } from '../../utils/cn';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-3", className)}>
            {/* Icon with debossed effect */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-bg-alt-light dark:bg-bg-elevated-dark shadow-debossed-light dark:shadow-debossed-dark flex-shrink-0">
                <span className="absolute text-4xl font-extrabold leading-none select-none -translate-y-[2px] text-text-primary-light dark:text-text-primary-dark opacity-90">
                    _
                </span>
            </div>

            {/* Brand text */}
            {showText && (
                <h1 className="text-text-primary-light dark:text-text-primary-dark text-3xl font-light tracking-tight select-none">
                    underscore
                </h1>
            )}
        </div>
    );
}
