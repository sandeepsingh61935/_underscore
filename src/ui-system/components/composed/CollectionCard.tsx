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
      className={cn('collection-card', className)}
    >
      {/* Favicon */}
      <div className="cc-favicon">
        {showFavicon ? (
          <img
            src={favicon}
            alt={`${domain} favicon`}
            onError={handleFaviconError}
          />
        ) : null}
        <Globe className={cn(!showFavicon && 'is-hidden')} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="cc-body">
        <div className="cc-title-row">
          <h3 className="cc-title">{domain}</h3>
          {category && <span className="cc-tag">{category}</span>}
        </div>
        <p className="cc-meta">
          {count} {count === 1 ? 'highlight' : 'highlights'}
        </p>
      </div>

      {/* Arrow */}
      <div className="cc-arrow" aria-hidden="true">
        <ArrowRight aria-hidden="true" />
      </div>
    </button>
  );
}
