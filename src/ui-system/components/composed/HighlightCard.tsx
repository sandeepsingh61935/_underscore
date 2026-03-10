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
  /** Optional color role */
  colorRole?: 'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'teal';
}

export interface HighlightCardProps {
  highlight: Highlight;
  onCopy?: (text: string) => void;
  onDelete?: (id: string) => void;
  onNavigate?: (urlPath: string) => void;
  className?: string;
}

const colorMap: Record<string, string> = {
  yellow: 'border-l-yellow-400',
  orange: 'border-l-orange-400',
  blue: 'border-l-blue-400',
  green: 'border-l-green-400',
  purple: 'border-l-purple-400',
  pink: 'border-l-pink-400',
  teal: 'border-l-teal-400',
};

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

  const colorClass = highlight.colorRole
    ? colorMap[highlight.colorRole]
    : 'border-l-primary';

  return (
    <div
      className={cn(
        'group relative p-4 bg-card border border-border rounded-lg',
        'border-l-4 transition-all duration-short ease-standard',
        'hover:shadow-md hover:bg-secondary/30 group-focus-within:shadow-md group-focus-within:bg-secondary/30',
        colorClass,
        className
      )}
    >
      {/* Highlight Text */}
      <p className="text-body-medium text-foreground leading-relaxed line-clamp-3 pr-8">
        "{highlight.text}"
      </p>

      {/* Metadata */}
      <div className="flex items-center gap-2 mt-3 text-label-small text-muted-foreground">
        <span>{formatDate(highlight.createdAt)}</span>
        {highlight.urlPath && (
          <>
            <span>•</span>
            <button
              type="button"
              onClick={() => onNavigate?.(highlight.urlPath!)}
              className={cn(
                'inline-flex min-h-[48px] max-w-[200px] items-center rounded-md px-2 -mx-2 text-left transition-colors duration-short ease-standard',
                'truncate hover:text-primary hover:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
              )}
            >
              {highlight.urlPath}
            </button>
          </>
        )}
      </div>

      {/* Action Buttons - Revealed on hover */}
      <div
        className={cn(
          'absolute top-3 right-3 flex items-center gap-1',
          'opacity-100 transition-opacity duration-short ease-standard sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
        )}
      >
        {highlight.urlPath && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(highlight.urlPath!)}
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-md text-muted-foreground transition-colors duration-short ease-standard hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Open source page"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {onCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-md transition-colors duration-short ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'hover:bg-secondary',
              copied
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground hover:text-foreground'
            )}
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
            className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-md text-muted-foreground transition-colors duration-short ease-standard hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Delete highlight"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
