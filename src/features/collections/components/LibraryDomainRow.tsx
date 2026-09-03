/**
 * @file LibraryDomainRow.tsx
 * @description Domain list row: 16px favicon + title + highlight count; optional Paid quiet actions.
 * Disclosure is the row itself (no action verb).
 */

import React from 'react';

import { DomainFavicon } from '@/features/collections/components/DomainFavicon';
import { ScopeRowActions } from '@/features/collections/components/ScopeRowActions';

export interface LibraryDomainRowProps {
  domain: string;
  count: number;
  onOpen: () => void;
  showActions?: boolean;
  onDelete?: () => void;
  /** Optional secondary line (e.g. last active date). */
  sub?: string;
}

export function LibraryDomainRow({
  domain,
  count,
  onOpen,
  showActions = false,
  onDelete,
  sub,
}: LibraryDomainRowProps): React.ReactElement {
  return (
    <div className="domain-item">
      <button type="button" className="domain-main" onClick={onOpen} aria-label={domain}>
        <DomainFavicon domain={domain} className="domain-favicon" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="title">{domain}</div>
          {sub ? <div className="sub">{sub}</div> : null}
        </div>
        <span
          className="u-serif"
          style={{
            fontSize: 16,
            fontStyle: 'italic',
            color: 'var(--ink-3)',
            flexShrink: 0,
          }}
        >
          {count}
        </span>
      </button>
      <ScopeRowActions kind="domain" show={showActions} onDelete={onDelete} />
    </div>
  );
}
