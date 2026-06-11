/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L1052-1066 (V2_Icon)
 * V2 contract:
 *   - SVG with viewBox "0 0 24 24", fill "none", stroke "var(--ink)",
 *     strokeWidth "1.6", strokeLinecap/join "round".
 *   - Size 24 default; sm/md/lg scale variants per impl.
 *   - aria-hidden since icon is decorative (paired with text label).
 *
 * Note: current impl uses lucide-react components (not name-based SVG path
 * lookup). The lucide component already renders with viewBox "0 0 24 24",
 * fill "none", stroke-linecap/join round. We lock the public contract:
 * color routes through V2 tokens, sizes match V2 scale, decorative.
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
