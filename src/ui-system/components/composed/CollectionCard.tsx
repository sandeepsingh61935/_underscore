import { ArrowRight, Globe } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '../../utils/cn';

export interface CollectionCardProps {
  /** Domain name (e.g., "github.com") */
  domain: string;
  /** Optional category label */
  category?: string;
  /** Favicon URL */
  favicon?: string;
  /** Number of highlights in this collection */
  count: number;
  /** Click handler */
  onClick?: () => void;
  /** Additional className */
  className?: string;
}

export function CollectionCard({
  domain,
  category,
  favicon,
  count,
  onClick,
  className,
}: CollectionCardProps): React.JSX.Element {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showFavicon = favicon && !faviconFailed;

  const handleFaviconError = (): void => {
    setFaviconFailed(true);
  };

  return (
    <button
      onClick={onClick}
      aria-label={`Open ${domain} collection with ${count} ${count === 1 ? 'highlight' : 'highlights'}`}
      className={cn(
        'group relative flex items-center gap-4 p-4 w-full text-left',
        'border border-[color:var(--rule-soft)] rounded min-h-[44px]',
        'transition-colors duration-step-0 ease-standard',
        'hover:border-[color:var(--rule)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2',
        className
      )}
      style={{ backgroundColor: 'var(--paper)' }}
    >
      {/* Favicon */}
      <div
        className="shrink-0 w-10 h-10 rounded flex items-center justify-center overflow-hidden border"
        style={{ backgroundColor: 'var(--paper-2)', borderColor: 'var(--rule-soft)' }}
      >
        {showFavicon ? (
          <img
            src={favicon}
            alt={`${domain} favicon`}
            className="w-6 h-6 object-contain"
            onError={handleFaviconError}
          />
        ) : null}
        <Globe
          className={cn('w-5 h-5', showFavicon && 'hidden')}
          style={{ color: 'var(--ink-3)' }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className="truncate"
            style={{ fontSize: 'var(--step-0)', color: 'var(--ink)' }}
          >
            {domain}
          </h3>
          {category && (
            <span
              className="shrink-0 px-2 py-0.5 rounded-full"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                backgroundColor: 'var(--paper-2)',
              }}
            >
              {category}
            </span>
          )}
        </div>
        <p
          className="mt-0.5"
          style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}
        >
          {count} {count === 1 ? 'highlight' : 'highlights'}
        </p>
      </div>

      {/* Arrow - animates on hover */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ backgroundColor: 'var(--paper-2)' }}
        aria-hidden="true"
      >
        <ArrowRight
          className="w-4 h-4 transition-transform duration-step-0 ease-standard"
          style={{ color: 'var(--ink-3)' }}
        />
      </div>
    </button>
  );
}
