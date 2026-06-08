import { ChevronLeft } from 'lucide-react';
import React from 'react';

import { Logo } from '@/ui-system/components/primitives/Logo';
import { cn } from '@/ui-system/utils/cn';

/**
 * AppHeader — single shared sticky header primitive
 *
 * V2 Token Mapping:
 *   Container bg:  var(--paper)               (V2 uses flat surfaces, not color-mix glass)
 *   Border:        var(--rule-soft)            (V2 uses borders, not shadows)
 *   Height:        min-h-[64px] default / min-h-[56px] compact
 *   Padding:       px-6 py-4 default / px-4 py-3 compact
 *
 * Logo rule:
 *   Logo is NEVER interactive. It is always a plain non-clickable brand mark.
 *   Back navigation belongs to the back slot (sub variant) or the
 *   content body (breadcrumb). Never the logo.
 *
 * Variants:
 *   primary    — logo left · action right   (Collections, DomainDetails, Dashboard)
 *   sub        — back left · logo center · spacer right (screens with explicit back)
 *   standalone — logo centered · no controls (Settings, Privacy, SignIn, auth flows)
 *
 * Contexts:
 *   compact    — popup (400px): tighter padding px-4 py-3, logo size sm
 *   default    — web SPA (640px): standard padding px-6 py-4, logo size md
 */
export interface AppHeaderProps {
  /** Layout variant — see docs above */
  variant?: 'primary' | 'sub' | 'standalone';
  /**
   * primary: trailing slot — Settings gear, UserMenu, avatar, etc.
   * Caller is responsible for 44×44px touch target on action content.
   */
  action?: React.ReactNode;
  /** sub: back button click handler */
  onBack?: () => void;
  /** sub: label shown next to back chevron (e.g. "Collections") */
  backLabel?: string;
  /** Popup context — tighter padding + sm logo */
  compact?: boolean;
  className?: string;
}

export function AppHeader({
  variant = 'primary',
  action,
  onBack,
  backLabel,
  compact = false,
  className,
}: AppHeaderProps): React.ReactElement {
  const surfaceStyle: React.CSSProperties = {
    backgroundColor: 'var(--paper)',
    borderBottom: '1px solid var(--rule-soft)',
  };

  const base = cn(
    'sticky top-0 z-10 w-full backdrop-blur-md',
    compact ? 'min-h-[56px] px-4 py-3' : 'min-h-[64px] px-6 py-4'
  );

  if (variant === 'primary') {
    return (
      <header
        className={cn(base, 'flex items-center justify-between', className)}
        style={surfaceStyle}
      >
        <div>
          <Logo size={compact ? 'sm' : 'md'} />
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
    );
  }

  if (variant === 'sub') {
    return (
      <header
        className={cn(base, 'relative flex items-center justify-between', className)}
        style={surfaceStyle}
      >
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded px-2 -mx-2 border-0 cursor-pointer transition-colors duration-step-0 ease-standard hover:text-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--ink-2)',
            fontSize: 'var(--step-0)',
          }}
          aria-label={`Go back${backLabel ? ` to ${backLabel}` : ''}`}
        >
          <ChevronLeft size={13} />
          {backLabel}
        </button>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <Logo size={compact ? 'sm' : 'md'} />
        </div>

        <div className="min-w-[44px]" aria-hidden="true" />
      </header>
    );
  }

  return (
    <header
      className={cn(base, 'flex items-center justify-center', className)}
      style={surfaceStyle}
    >
      <Logo size={compact ? 'sm' : 'md'} />
    </header>
  );
}
