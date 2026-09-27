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
 * Editorial segmented control with animated sliding indicator.
 * Surface: --paper-2; active pill: --accent; idle text: --ink-2; active text: --paper.
 * Geometry: --radius. No box-shadow (Editorial uses borders).
 * Styles: `.seg-control` / `.seg-option` in src/ui-system/theme/global.css.
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
    <div className={cn('seg-control', className)}>
      {options.map((opt) => {
        const isActive = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={isActive}
            className={cn('seg-option', isActive && 'is-active')}
          >
            {isActive && (
              <motion.div
                layoutId={`seg-indicator-${layoutId}`}
                className="seg-option-indicator"
                transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
              />
            )}
            <span className="seg-option-label">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
