import { Lock, Check } from 'lucide-react';
import React from 'react';

import { cn } from '../../utils/cn';

export interface ModeCardProps {
  id: string;
  label: string;
  description?: string;
  /** Icon component to render */
  icon?: React.ReactNode;
  isActive?: boolean;
  isLocked?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ModeCard({
  id: _id,
  label,
  description,
  icon,
  isActive = false,
  isLocked = false,
  onClick,
  className,
}: ModeCardProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn('mode-card', isActive && 'is-active', className)}
      aria-pressed={isActive}
      aria-disabled={isLocked}
    >
      <div className="mode-card-head">
        <div className="mode-card-id">
          {icon && <div className="mode-card-icon">{icon}</div>}
          <h3 className="mode-card-label">{label}</h3>
        </div>

        <div className="mode-card-state">
          {isLocked ? (
            <Lock className="mc-lock" aria-hidden="true" />
          ) : isActive ? (
            <div className="mc-check">
              <Check strokeWidth={3} aria-hidden="true" />
            </div>
          ) : (
            <div className="mc-radio" />
          )}
        </div>
      </div>

      {description && <p className="mode-card-desc">{description}</p>}
    </button>
  );
}
