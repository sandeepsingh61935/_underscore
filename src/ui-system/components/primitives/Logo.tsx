import React from 'react';

import { cn } from '../../utils/cn';

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: LogoSize;
}

const sizeMap: Record<LogoSize, { sizePx: number; textSize: string }> = {
  sm: { sizePx: 28, textSize: 'var(--step-1)' },
  md: { sizePx: 36, textSize: 'var(--step-3)' },
  lg: { sizePx: 56, textSize: 'var(--step-4)' },
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
    <div
      className={cn('flex items-center', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? 8 : size === 'md' ? 10 : 12,
      }}
    >
      <div
        className="welcome__logo-mark"
        style={{
          width: s.sizePx,
          height: s.sizePx,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
          overflow: 'hidden',
          backgroundColor: 'var(--ink)',
          boxShadow: '0 0 0 1px color-mix(in srgb, var(--ink) 12%, transparent)',
          flexShrink: 0,
        }}
      >
        {/* Ambient reflection — subtle inner highlight at badge bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '28%',
            borderRadius: 9999,
            backgroundColor: 'color-mix(in srgb, var(--paper) 8%, transparent)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Baseline mark */}
        <div
          style={{
            position: 'absolute',
            bottom: '22%',
            left: '18%',
            right: '18%',
            height: '13%',
            borderRadius: 9999,
            backgroundColor: 'var(--paper)',
            zIndex: 2,
          }}
        />
      </div>

      {showText && (
        <span
          className="u-serif"
          style={{
            color: 'var(--ink)',
            fontSize: s.textSize,
            letterSpacing: '-0.02em',
            fontWeight: 400,
          }}
        >
          underscore
        </span>
      )}
    </div>
  );
}
