import React from 'react';

import { cn } from '../../utils/cn';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: LogoSize;
}

const sizeMap: Record<LogoSize, { badge: string; text: string; gap: string }> = {
  sm: { badge: 'w-7 h-7', text: 'text-title-large', gap: 'gap-2' },
  md: { badge: 'w-9 h-9', text: 'text-headline-medium', gap: 'gap-[10px]' },
  lg: { badge: 'w-16 h-16', text: 'text-headline-large', gap: 'gap-3' },
};

/**
 * Logo — MD3 compliant, squircle badge
 *
 * CSS vars (global.css):
 *   --logo-bg                 badge fill (dark in light mode, light in dark mode)
 *   --logo-text               mark fill (div background — reliable at all sizes)
 *   --logo-ambient-reflection subtle inner highlight
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
      {/* Badge — squircle shape */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-[22%] overflow-hidden',
          s.badge
        )}
        style={{
          background: 'var(--logo-bg)',
          boxShadow: [
            'inset 0 0 0 1px rgba(255,255,255,0.06)',
            '0 2px 8px rgba(0,0,0,0.5)',
          ].join(', '),
        }}
      >
        {/* Top-edge shine */}
        <div
          className="absolute top-0 left-0 right-0 h-[45%] rounded-t-[22%] pointer-events-none z-[1]"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)' }}
        />

        {/* Ambient reflection — subtle inner highlight at badge bottom */}
        <div
          className="absolute bottom-0 left-[10%] right-[10%] h-[28%] rounded-full pointer-events-none z-[1]"
          style={{ background: 'var(--logo-ambient-reflection)' }}
        />

        {/* Baseline mark */}
        <div
          className="absolute z-[2] rounded-full"
          style={{
            bottom: '22%',
            left: '18%',
            right: '18%',
            height: '13%',
            background: 'var(--logo-text)',
          }}
        />
      </div>

      {/* Wordmark */}
      {showText && (
        <span className={cn('font-display tracking-[-0.02em] text-on-surface', s.text)}>
          underscore
        </span>
      )}
    </div>
  );
}
