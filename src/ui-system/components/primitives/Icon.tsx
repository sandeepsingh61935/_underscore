/**
 * MD3 Icon Component
 * @see https://m3.material.io/styles/icons/overview
 */

import React, { HTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    icon: LucideIcon;
    size?: 'sm' | 'md' | 'lg';
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
                size === 'sm' && 'w-[18px] h-[18px]',
                size === 'md' && 'w-[24px] h-[24px]',
                size === 'lg' && 'w-[40px] h-[40px]',
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
