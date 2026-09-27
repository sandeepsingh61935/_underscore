import { ChevronLeft, Download, Trash2, Globe, ExternalLink } from 'lucide-react';
import React from 'react';

import type { Highlight } from '../components/composed/HighlightCard';
import { HighlightCard } from '../components/composed/HighlightCard';
import { cn } from '../utils/cn';

export interface DomainDetailsViewProps {
  domain: string;
  favicon?: string;
  highlights: Highlight[];
  onBack: () => void;
  onHighlightCopy?: (text: string) => void;
  onHighlightDelete?: (id: string) => void;
  onHighlightNavigate?: (urlPath: string) => void;
  onExportAll?: () => void;
  onClearAll?: () => void;
  onVisitDomain?: () => void;
  className?: string;
}

export function DomainDetailsView({
  domain,
  favicon,
  highlights,
  onBack,
  onHighlightCopy,
  onHighlightDelete,
  onHighlightNavigate,
  onExportAll,
  onClearAll,
  onVisitDomain,
  className,
}: DomainDetailsViewProps): React.JSX.Element {
  return (
    <div className={cn('domain-view', className)}>
      {/* Header with Breadcrumb */}
      <div className="domain-head">
        <button onClick={onBack} className="icon-btn" title="Back to collections">
          <ChevronLeft aria-hidden="true" />
        </button>

        {/* Domain Info */}
        <div className="domain-id">
          <div className="domain-fav">
            {favicon ? (
              <img src={favicon} alt={`${domain} favicon`} />
            ) : (
              <Globe aria-hidden="true" />
            )}
          </div>
          <div className="domain-titles">
            <h1 className="domain-title">{domain}</h1>
            <p className="domain-count">
              {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="domain-actions">
          {onVisitDomain && (
            <button
              onClick={onVisitDomain}
              className="icon-btn"
              title="Visit website"
            >
              <ExternalLink aria-hidden="true" />
            </button>
          )}
          {onExportAll && highlights.length > 0 && (
            <button onClick={onExportAll} className="icon-btn" title="Export all">
              <Download aria-hidden="true" />
            </button>
          )}
          {onClearAll && highlights.length > 0 && (
            <button onClick={onClearAll} className="icon-btn" title="Clear all">
              <Trash2 aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Highlights List */}
      {highlights.length > 0 ? (
        <div className="scroll-list">
          {highlights.map((highlight) => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              onCopy={onHighlightCopy}
              onDelete={onHighlightDelete}
              onNavigate={onHighlightNavigate}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Globe aria-hidden="true" />
          </div>
          <h3 className="empty-title">No highlights yet</h3>
          <p className="empty-desc">
            Visit {domain} and start highlighting content to save it here.
          </p>
        </div>
      )}
    </div>
  );
}
