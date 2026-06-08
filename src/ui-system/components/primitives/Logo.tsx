import React from 'react';

import { cn } from '../../utils/cn';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: LogoSize;
}

const sizeMap: Record<LogoSize, { badge: string; text: string; gap: string; textSize: string }> = {
  sm: { badge: 'w-7 h-7', text: '', gap: 'gap-2', textSize: 'var(--step-1)' },
  md: { badge: 'w-9 h-9', text: '', gap: 'gap-[10px]', textSize: 'var(--step-3)' },
  lg: { badge: 'w-16 h-16', text: '', gap: 'gap-3', textSize: 'var(--step-4)' },
};

/**
 * V2 Logo — editorial squircle badge.
 *
 * Tokens (V2):
 *   --ink                 badge fill (dark in light mode, light in dark mode)
 *   --paper               mark fill
 *   --paper-overlay-08    ambient reflection
 *
 * Mark: pill-shaped div in the lower third of the badge.
 * Uses background instead of SVG fill to avoid grey anti-aliasing artifacts at sm/md sizes.
 */
export function Logo({
  className = '',
  showText = true,
  size = 'md',
}: LogoProps): React.ReactElement {
  const s = sizeMap[size];
  return (
    <div className={cn('flex items-center', s.gap, className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-[22%] overflow-hidden',
          s.badge
        )}
        style={{ backgroundColor: 'var(--ink)' }}
      >
        {/* Ambient reflection — subtle inner highlight at badge bottom */}
        <div
          className="absolute bottom-0 left-[10%] right-[10%] h-[28%] rounded-full pointer-events-none z-[1]"
          style={{ backgroundColor: 'var(--paper-overlay-08)' }}
        />

        {/* Baseline mark */}
        <div
          className="absolute z-[2] rounded-full"
          style={{
            bottom: '22%',
            left: '18%',
            right: '18%',
            height: '13%',
            backgroundColor: 'var(--paper)',
          }}
        />
      </div>

      {showText && (
        <span
          className={cn('font-serif tracking-[-0.02em]', s.text)}
          style={{ color: 'var(--ink)', fontSize: s.textSize }}
        >
          underscore
        </span>
      )}
    </div>
  );
}
