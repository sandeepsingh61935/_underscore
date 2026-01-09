/**
 * Material Design 3 Icon Component
 * 
 * Wrapper for Material Symbols with MD3 sizing and colors
 * Uses lucide-react icons (already installed) for consistency
 * 
 * @see https://m3.material.io/styles/icons/overview
 */

import React, { HTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    /**
     * Lucide icon component
     */
    icon: LucideIcon;

    /**
     * Size variant
     * - sm: 18px (small icons in compact UI)
     * - md: 24px (default, standard icon size)
     * - lg: 40px (large featured icons)
     */
    size?: 'sm' | 'md' | 'lg';

    /**
     * Color variant using MD3 tokens
     */
    color?: 'primary' | 'on-surface' | 'on-surface-variant' | 'error';
}

const Icon: React.FC<IconProps> = ({
    icon: IconComponent,
    size = 'md',
    color = 'on-surface',
    className,
    ...props
}) => {
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center flex-shrink-0',
                // Size variants
                size === 'sm' && 'w-[18px] h-[18px]',
                size === 'md' && 'w-[24px] h-[24px]',
                size === 'lg' && 'w-[40px] h-[40px]',
                // Color variants
                color === 'primary' && 'text-primary',
                color === 'on-surface' && 'text-on-surface',
                color === 'on-surface-variant' && 'text-on-surface-variant',
                color === 'error' && 'text-error',
                className
            )}
            {...props}
        >
            <IconComponent
                className={cn(
                    size === 'sm' && 'w-[18px] h-[18px]',
                    size === 'md' && 'w-[24px] h-[24px]',
                    size === 'lg' && 'w-[40px] h-[40px]'
                )}
                strokeWidth={2}
            />
        </span>
    );
};

Icon.displayName = 'Icon';

export { Icon };
