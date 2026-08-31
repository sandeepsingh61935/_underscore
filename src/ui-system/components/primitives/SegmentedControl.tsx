import { motion } from 'framer-motion';
import React from 'react';

import { cn } from '@/ui-system/utils/cn';

export interface SegmentedControlProps {
  /** The option labels/values to display */
  options: readonly string[];
  /** Currently selected value */
  value: string;
  /** Called when user selects a different value */
  onChange: (value: string) => void;
  /**
   * Unique layoutId suffix — required if multiple SegmentedControls on same screen.
   * Defaults to "default". Use descriptive names: "theme", "mode", "sort".
   */
  layoutId?: string;
  /** If true, active indicator uses --ink-mode color tint instead of neutral surface */
  modeColors?: boolean;
  className?: string;
}

/**
 * V2 Segmented control with animated sliding indicator.
 * Surface: --paper-2; active pill: --accent; idle text: --ink-2; active text: --paper.
 * Geometry: V2 --radius (2px). No box-shadow (V2 uses borders).
 *
 * Usage:
 *   <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} layoutId="theme" />
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  layoutId = 'default',
  modeColors: _modeColors = false,
  className,
}: SegmentedControlProps): React.JSX.Element {
  return (
    <div
      className={cn('relative flex p-[3px] gap-[2px] rounded', className)}
      style={{ backgroundColor: 'var(--paper-2)' }}
    >
      {options.map((opt) => {
        const isActive = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={isActive}
            className={cn(
              'relative flex-1 py-[6px] px-2 rounded border-0 cursor-pointer',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var( --accent )] focus-visible:ring-offset-1'
            )}
            style={{
              color: isActive ? 'var(--paper)' : 'var(--ink-2)',
              fontSize: 'var(--step--1)',
            }}
          >
            {isActive && (
              <motion.div
                layoutId={`seg-indicator-${layoutId}`}
                className="absolute inset-0 rounded"
                style={{ backgroundColor: 'var( --accent )' }}
                transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
              />
            )}
            <span className="relative z-10">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
