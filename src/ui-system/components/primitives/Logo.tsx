import React from 'react';

interface LogoProps {
    className?: string;
    showText?: boolean;
}

/**
 * Logo Component - Direct copy from design mockup
 * Source: /docs/07-design/mode-selection/mode-selection-code.html
 */
export function Logo({ className = '', showText = true }: LogoProps) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full bg-badge-light dark:bg-badge-dark shadow-inner dark:shadow-none text-text-primary dark:text-white -mt-0.5">
                <span className="absolute text-2xl md:text-3xl font-extrabold leading-none select-none -translate-y-[2px]">_</span>
            </div>
            {showText && (
                <h1 className="text-text-primary dark:text-white text-3xl md:text-4xl font-light tracking-tight">
                    underscore
                </h1>
            )}
        </div>
    );
}
