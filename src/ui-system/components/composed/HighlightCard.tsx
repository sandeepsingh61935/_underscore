import { Copy, Trash2, Check, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '../../utils/cn';

export interface Highlight {
  id: string;
  text: string;
  /** URL path where this highlight was captured */
  urlPath?: string;
  /** Timestamp when captured */
  createdAt: Date | string;
  /** Optional accent color ("with" or "without") */
  colorRole?: 'accent' | 'none';
}

export interface HighlightCardProps {
  highlight: Highlight;
  onCopy?: (text: string) => void;
  onDelete?: (id: string) => void;
  onNavigate?: (urlPath: string) => void;
  className?: string;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

export function HighlightCard({
  highlight,
  onCopy,
  onDelete,
  onNavigate,
  className,
}: HighlightCardProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onCopy) {
      onCopy(highlight.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(highlight.id);
    }
  };

  const leftBorderStyle: React.CSSProperties =
    highlight.colorRole === 'accent'
      ? { borderLeft: '4px solid var(--accent)' }
      : { borderLeft: '4px solid var(--rule-soft)' };

  return (
    <div className={cn('hl-card', className)} style={leftBorderStyle}>
      <p className="hl-text">"{highlight.text}"</p>

      <div className="hl-meta">
        <span>{formatDate(highlight.createdAt)}</span>
        {highlight.urlPath && (
          <>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigate?.(highlight.urlPath!)}
              className="hl-link"
            >
              {highlight.urlPath}
            </button>
          </>
        )}
      </div>

      <div className="hl-actions">
        {highlight.urlPath && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(highlight.urlPath!)}
            className="icon-btn"
            aria-label="Open source page"
          >
            <ExternalLink aria-hidden="true" />
          </button>
        )}

        {onCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn('icon-btn', copied && 'is-active')}
            aria-label={copied ? 'Copied to clipboard' : 'Copy highlight text'}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="icon-btn"
            aria-label="Delete highlight"
          >
            <Trash2 aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
