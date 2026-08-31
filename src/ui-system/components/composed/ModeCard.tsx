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
  const containerStyle: React.CSSProperties = isActive
    ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }
    : isLocked
      ? { backgroundColor: 'var(--paper)', borderColor: 'var(--rule-soft)' }
      : { backgroundColor: 'var(--paper)', borderColor: 'var(--rule-soft)' };

  const iconWrapStyle: React.CSSProperties = isActive
    ? { backgroundColor: 'var(--accent-ink)', color: 'var(--paper)' }
    : { backgroundColor: 'var(--paper-2)', color: 'var(--ink-3)' };

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--step-2)',
    color: isActive ? 'var(--paper)' : 'var(--ink)',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: 'var(--step--1)',
    color: isActive ? 'var(--accent-ink)' : 'var(--ink-3)',
    opacity: isActive ? 0.9 : 1,
  };

  return (
    <button
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        'group relative flex flex-col items-start p-5 w-full text-left overflow-hidden border rounded min-h-[44px] duration-step-0 ease-standard',
        !isActive && !isLocked && 'hover:border-[color:var(--accent)]',
        className
      )}
      style={containerStyle}
      aria-pressed={isActive}
      aria-disabled={isLocked}
    >
      <div className="flex items-start justify-between w-full mb-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded" style={iconWrapStyle}>
              {icon}
            </div>
          )}
          <div>
            <h3 style={labelStyle}>{label}</h3>
          </div>
        </div>

        <div className="shrink-0">
          {isLocked ? (
            <Lock className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
          ) : isActive ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-ink)' }}
            >
              <Check
                className="w-3 h-3"
                style={{ color: 'var(--accent)' }}
                strokeWidth={3}
              />
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full border"
              style={{ borderColor: 'var(--rule-soft)' }}
            />
          )}
        </div>
      </div>

      {description && (
        <p className="pl-[calc(2.5rem+0.75rem)]" style={descriptionStyle}>
          {description}
        </p>
      )}
    </button>
  );
}
