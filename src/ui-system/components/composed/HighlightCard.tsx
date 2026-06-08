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
  /** Optional accent color (V2 single-accent mode means "with" or "without") */
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
    <div
      className={cn(
        'group relative p-4 border rounded min-h-[44px]',
        className
      )}
      style={{
        backgroundColor: 'var(--paper)',
        borderColor: 'var(--rule-soft)',
        ...leftBorderStyle,
      }}
    >
      <p
        className="leading-relaxed line-clamp-3 pr-8"
        style={{ fontSize: 'var(--step-0)', color: 'var(--ink)' }}
      >
        "{highlight.text}"
      </p>

      <div
        className="flex items-center gap-2 mt-3"
        style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}
      >
        <span>{formatDate(highlight.createdAt)}</span>
        {highlight.urlPath && (
          <>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigate?.(highlight.urlPath!)}
              className="inline-flex min-h-[44px] max-w-[200px] items-center px-2 -mx-2 text-left truncate transition-colors duration-step-0 ease-standard hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
              style={{ color: 'inherit' }}
            >
              {highlight.urlPath}
            </button>
          </>
        )}
      </div>

      <div
        className="absolute top-3 right-3 flex items-center gap-1 transition-opacity duration-step-0 ease-standard"
        aria-hidden={false}
      >
        {highlight.urlPath && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(highlight.urlPath!)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded transition-colors duration-step-0 ease-standard hover:bg-[color:var(--paper-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Open source page"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {onCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded transition-colors duration-step-0 ease-standard hover:bg-[color:var(--paper-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
            style={{ color: copied ? 'var(--accent)' : 'var(--ink-3)' }}
            aria-label={copied ? 'Copied to clipboard' : 'Copy highlight text'}
          >
            {copied ? (
              <Check className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Copy className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded transition-colors duration-step-0 ease-standard hover:bg-[color:var(--paper-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
            style={{ color: 'var(--ink-3)' }}
            aria-label="Delete highlight"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
