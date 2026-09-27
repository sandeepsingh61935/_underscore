/**
 * Design contract: src/ui-system/theme/global.css (Mode pill section)
 * Chrome affordance → settings. Modes distinguished by glyph + label,
 * never color (single --accent dot for all modes).
 */
import React, { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export type ModePillMode = 'basic' | 'pro' | 'pro_xai';

export interface ModePillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  mode?: ModePillMode;
}

const MODE_META: Record<ModePillMode, { glyph: string; label: string }> = {
  basic: { glyph: 'G', label: 'Guest' },
  pro: { glyph: 'S', label: 'Starter' },
  pro_xai: { glyph: 'P', label: 'Pro' },
};

const ModePill = forwardRef<HTMLButtonElement, ModePillProps>(
  ({ mode = 'basic', className, children, style, ...props }, ref) => {
    const meta = MODE_META[mode];
    return (
      <button
        ref={ref}
        type="button"
        className={cn('mode-pill', className)}
        style={style}
        aria-label={`Current mode: ${meta.label}. Open settings.`}
        {...props}
      >
        <span className="mode-pill-dot" aria-hidden="true">
          {meta.glyph}
        </span>
        {children ?? meta.label}
      </button>
    );
  }
);

ModePill.displayName = 'ModePill';

export { ModePill };
