import { ChevronLeft } from 'lucide-react';
import React from 'react';

import { Logo } from '@/ui-system/components/primitives/Logo';
import { cn } from '@/ui-system/utils/cn';

/**
 * AppHeader — single shared sticky header primitive
 *
 * Token mapping:
 *   Container bg:  var(--paper) (flat surfaces, not color-mix glass)
 *   Border:        var(--rule-soft) (borders, not shadows)
 *   Height:        64px default / 56px compact
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
 *   compact    — popup (400px): tighter padding, sm logo
 *   default    — web SPA (640px): standard padding, md logo
 */
export interface AppHeaderProps {
  /** Layout variant — see docs above */
  variant?: 'primary' | 'sub' | 'standalone';
  /**
   * primary: trailing slot — Settings gear, UserMenu, avatar, etc.
   * Caller is responsible for 44px touch target on action content.
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
  const base = cn(
    'app-header',
    compact ? 'app-header-compact' : 'app-header-default',
    className
  );

  if (variant === 'primary') {
    return (
      <header className={base}>
        <div>
          <Logo size={compact ? 'sm' : 'md'} />
        </div>
        {action && <div className="app-header-actions">{action}</div>}
      </header>
    );
  }

  if (variant === 'sub') {
    return (
      <header className={base}>
        <button
          type="button"
          onClick={onBack}
          className="back-btn"
          aria-label={`Go back${backLabel ? ` to ${backLabel}` : ''}`}
        >
          <ChevronLeft size={13} aria-hidden="true" />
          {backLabel}
        </button>

        <div className="app-header-center">
          <Logo size={compact ? 'sm' : 'md'} />
        </div>

        <div className="app-header-spacer" aria-hidden="true" />
      </header>
    );
  }

  return (
    <header className={cn(base, 'app-header-standalone')}>
      <Logo size={compact ? 'sm' : 'md'} />
    </header>
  );
}
