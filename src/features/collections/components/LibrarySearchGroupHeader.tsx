/**
 * Quiet domain/section header for hierarchical search results.
 * Whole header is the disclosure control (open domain or section).
 */
import React from 'react';

export interface LibrarySearchGroupHeaderProps {
  title: string;
  /** e.g. "3 matches" or "Domain name match" */
  meta: string;
  onOpen: () => void;
  level: 'domain' | 'section';
}

export function LibrarySearchGroupHeader({
  title,
  meta,
  onOpen,
  level,
}: LibrarySearchGroupHeaderProps): React.ReactElement {
  return (
    <button
      type="button"
      data-testid={`search-group-${level}`}
      data-search-group-title={title}
      onClick={onOpen}
      aria-label={`${title}, ${meta}. Open ${level}.`}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        padding: level === 'domain' ? '12px 16px 6px' : '10px 16px 4px',
        borderTop: level === 'domain' ? '1px solid var(--rule-soft)' : undefined,
        background: level === 'domain' ? 'var(--paper-2)' : 'transparent',
      }}
    >
      <span
        className={level === 'domain' ? 'u-serif' : 'u-mono'}
        style={{
          fontSize: level === 'domain' ? 'var(--step-1)' : 'var(--step--2)',
          color: 'var(--ink)',
          letterSpacing: level === 'section' ? '0.04em' : '-0.01em',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <span
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          color: 'var(--ink-3)',
          flexShrink: 0,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {meta}
      </span>
    </button>
  );
}

export function formatSearchMatchMeta(
  matchCount: number,
  nameMatched: boolean,
): string {
  if (matchCount > 0) {
    return matchCount === 1 ? '1 match' : `${matchCount} matches`;
  }
  if (nameMatched) return 'Name match';
  return '0 matches';
}
