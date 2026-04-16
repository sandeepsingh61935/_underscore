import { motion } from 'framer-motion';
import React from 'react';

import { springs } from '@/ui-system/motion/springs';
import { cn } from '@/ui-system/utils/cn';

export interface SegmentedControlProps {
  /** The option labels/values to display */
  options: readonly string[];
  /** Currently selected value */
  value: string;
  /** Called when user selects a different option */
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
 * Segmented control with animated sliding indicator.
 * Active pill slides via Framer layoutId — no CSS transitions on transform.
 *
 * Usage:
 *   <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} layoutId="theme" />
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  layoutId = 'default',
  modeColors = false,
  className,
}: SegmentedControlProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'relative flex bg-surface-container rounded-[8px] p-[3px] gap-[2px]',
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          aria-pressed={value === opt}
          className={cn(
            'relative flex-1 py-[6px] px-2 rounded-[6px]',
            'text-label-small z-10 border-0 cursor-pointer',
            'transition-colors duration-short ease-standard',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
            value === opt
              ? 'text-on-primary'
              : 'bg-transparent text-on-surface-variant hover:text-on-surface',
          )}
        >
          {/* Animated sliding indicator — renders inside the active button */}
          {value === opt && (
            <motion.div
              layoutId={`seg-indicator-${layoutId}`}
              className="absolute inset-0 rounded-[6px] bg-primary shadow-elevation-1"
              transition={springs.snappy}
            />
          )}
          <span className="relative z-10">{opt}</span>
        </button>
      ))}
    </div>
  );
}
