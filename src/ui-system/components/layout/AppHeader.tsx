import { ChevronLeft } from 'lucide-react';
import React from 'react';

import { Logo } from '@/ui-system/components/primitives/Logo';
import { cn } from '@/ui-system/utils/cn';

/**
 * AppHeader — single shared sticky header primitive
 *
 * MD3 Token Mapping:
 *   Container bg:  color-mix(surface 80%, transparent)  → §3b approved glass
 *   Blur:          backdrop-blur-md
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
   * Caller is responsible for 48×48px touch target on action content.
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
    'sticky top-0 z-10 w-full backdrop-blur-md',
    compact ? 'min-h-[56px] px-4 py-3' : 'min-h-[64px] px-6 py-4',
  );

  const glassStyle: React.CSSProperties = {
    backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface) 80%, transparent)',
  };

  if (variant === 'primary') {
    return (
      <header
        className={cn(base, 'flex items-center justify-between', className)}
        style={glassStyle}
      >
        {/* Logo — non-interactive brand mark */}
        <div>
          <Logo size={compact ? 'sm' : 'md'} />
        </div>

        {/* Trailing action slot */}
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </header>
    );
  }

  if (variant === 'sub') {
    return (
      <header
        className={cn(base, 'relative flex items-center justify-between', className)}
        style={glassStyle}
      >
        {/* Back — left slot */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[48px] min-w-[48px] items-center gap-1.5 rounded-md px-2 -mx-2 border-0 bg-transparent cursor-pointer text-body-small text-outline transition-colors duration-short ease-standard hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label={`Go back${backLabel ? ` to ${backLabel}` : ''}`}
        >
          <ChevronLeft size={13} />
          {backLabel}
        </button>

        {/* Logo — centered via absolute positioning */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <Logo size={compact ? 'sm' : 'md'} />
        </div>

        {/* Spacer — mirrors back button to keep logo visually centred */}
        <div className="min-w-[48px]" aria-hidden="true" />
      </header>
    );
  }

  // standalone
  return (
    <header
      className={cn(base, 'flex items-center justify-center', className)}
      style={glassStyle}
    >
      <Logo size={compact ? 'sm' : 'md'} />
    </header>
  );
}
