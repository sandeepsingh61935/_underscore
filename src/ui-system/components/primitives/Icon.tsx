/**
 * V2 Icon Component
 * Color tokens routed to V2 vars: --ink (default), --accent (primary/error),
 * --ink-2 (muted). Layout (sm/md/lg sizing) unchanged.
 */

import React, { HTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface IconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    icon: LucideIcon;
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'on-surface' | 'on-surface-variant' | 'error';
}

const colorVar: Record<NonNullable<IconProps['color']>, string> = {
    primary: 'var(--accent)',
    'on-surface': 'var(--ink)',
    'on-surface-variant': 'var(--ink-2)',
    // V2 spec rule 1: single accent. Error is an attention signal
    // and routes through the same channel as primary.
    error: 'var(--accent)',
};

const sizeClass: Record<NonNullable<IconProps['size']>, string> = {
    sm: 'w-[18px] h-[18px]',
    md: 'w-[24px] h-[24px]',
    lg: 'w-[40px] h-[40px]',
};

const Icon: React.FC<IconProps> = ({
    icon: IconComponent,
    size = 'md',
    color = 'on-surface',
    className,
    ...props
}) => {
    return (
        <span
            className={cn('inline-flex items-center justify-center flex-shrink-0', sizeClass[size], className)}
            style={{ color: colorVar[color] }}
            {...props}
        >
            <IconComponent
                className={sizeClass[size]}
                strokeWidth={2}
                aria-hidden="true"
            />
        </span>
    );
};

Icon.displayName = 'Icon';

export { Icon };
