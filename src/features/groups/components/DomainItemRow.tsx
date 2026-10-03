/**
 * @file DomainItemRow.tsx
 * @description Domain-rule row inside group detail. The row expands to show
 * the rule's resolved pages (from `resolveGroupPages`, source `via:<host>`).
 * Same row menu as page rows: Move to top / up / down + Remove.
 */

import React, { useState } from 'react';

import type { PageGroupItem } from '@/shared/types/page-group';
import type { ResolvedGroupPage } from '@/shared/utils/group-membership';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';

import type { ItemMoveTarget } from './GroupItemRow';

export interface DomainItemRowProps {
  item: Extract<PageGroupItem, { kind: 'domain' }>;
  matchedPages: ResolvedGroupPage[];
  highlightCount: number;
  highlightCountForUrl?: (urlNormalized: string) => number;
  onMove: (to: ItemMoveTarget) => void;
  onRemove: () => void;
  isSelectMode?: boolean;
  isPageSelected?: (urlNormalized: string) => boolean;
  onTogglePageSelect?: (urlNormalized: string) => void;
  onStartSelectMode?: () => void;
  onRemovePage?: (page: ResolvedGroupPage) => void;
}

export function DomainItemRow({
  item,
  matchedPages,
  highlightCount,
  highlightCountForUrl,
  onMove,
  onRemove,
  isSelectMode,
  isPageSelected,
  onTogglePageSelect,
  onStartSelectMode,
  onRemovePage,
}: DomainItemRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const letter = (item.hostname.trim().charAt(0) || '?').toUpperCase();

  return (
    <div
      data-testid={`group-domain-row-${item.id}`}
      style={{ borderBottom: '1px solid var(--rule-soft)' }}
    >
      <div
        className="domain-header-row"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: '44px',
          padding: '8px 12px 8px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          aria-expanded={expanded}
          aria-label={`${item.hostname}, ${matchedPages.length} pages`}
          data-testid={`group-domain-toggle-${item.id}`}
          style={{
            width: 24,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            fontSize: 'var(--step-0)',
            padding: 0,
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 140ms ease',
            }}
          >
            ▸
          </span>
        </button>
        <span
          aria-hidden="true"
          className="u-serif"
          style={{
            width: 18,
            height: 18,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--step--1)',
            color: 'var(--ink-3)',
            border: '1px solid var(--rule-soft)',
            borderRadius: 'var(--radius)',
            background: 'var(--paper-2)',
          }}
        >
          {letter}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="u-mono title"
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.hostname}
          </div>
          <div
            className="sub"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              color: 'var(--ink-3)',
              marginTop: 2,
            }}
          >
            {item.includeSubdomains ? 'domain + subdomains' : 'domain'} · {matchedPages.length}{' '}
            {matchedPages.length === 1 ? 'page' : 'pages'}
          </div>
        </div>
        <span
          className="u-serif"
          style={{
            fontSize: 16,
            fontStyle: 'italic',
            color: 'var(--ink-3)',
            flexShrink: 0,
            marginRight: 2,
          }}
        >
          {highlightCount}
        </span>
        <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${item.hostname}`}
                data-testid={`group-domain-menu-${item.id}`}
                style={{
                  minWidth: 32,
                  minHeight: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ink-3)',
                  cursor: 'pointer',
                  fontSize: 'var(--step-1)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <span aria-hidden="true">⋯</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onMove('top')}>Move to top</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onMove('up')}>Move up</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onMove('down')}>Move down</DropdownMenuItem>
              <DropdownMenuItem onSelect={onRemove}>Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {expanded ? (
        <div
          data-testid={`group-domain-pages-${item.id}`}
          style={{
            padding: '2px 16px 8px 46px',
            background: 'var(--paper-2)',
            borderTop: '1px solid var(--rule-soft)',
          }}
        >
          {matchedPages.length === 0 ? (
            <div
              className="u-sans"
              style={{ padding: '8px 0', fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}
            >
              No open pages match this rule yet.
            </div>
          ) : (
            matchedPages.map((page) => (
              <div
                key={page.urlNormalized}
                data-testid={`group-domain-page-row-${encodeURIComponent(page.urlNormalized)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: '38px',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--rule-soft)',
                }}
              >
                {isSelectMode ? (
                  <input
                    type="checkbox"
                    data-testid={`domain-page-checkbox-${encodeURIComponent(page.urlNormalized)}`}
                    aria-label={`Select ${page.title ?? page.urlNormalized}`}
                    checked={Boolean(isPageSelected?.(page.urlNormalized))}
                    onChange={() => onTogglePageSelect?.(page.urlNormalized)}
                    style={{
                      width: 16,
                      height: 16,
                      cursor: 'pointer',
                      flexShrink: 0,
                      accentColor: 'var(--accent)',
                    }}
                  />
                ) : null}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="u-sans"
                    style={{
                      fontSize: 'var(--step-0)',
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {page.title ?? page.urlNormalized}
                  </div>
                  <div
                    className="u-mono"
                    style={{
                      fontSize: 'var(--step--1)',
                      color: 'var(--ink-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {page.urlNormalized}
                  </div>
                </div>
                {highlightCountForUrl ? (
                  <span
                    className="u-serif"
                    style={{
                      fontSize: 14,
                      fontStyle: 'italic',
                      color: 'var(--ink-3)',
                      flexShrink: 0,
                    }}
                  >
                    {highlightCountForUrl(page.urlNormalized)}
                  </span>
                ) : null}
                <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Actions for ${page.title ?? page.urlNormalized}`}
                        data-testid={`domain-page-menu-${encodeURIComponent(page.urlNormalized)}`}
                        style={{
                          minWidth: 28,
                          minHeight: 28,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--ink-3)',
                          cursor: 'pointer',
                          fontSize: 'var(--step-0)',
                          borderRadius: 'var(--radius)',
                        }}
                      >
                        <span aria-hidden="true">⋯</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onStartSelectMode ? (
                        <DropdownMenuItem onSelect={onStartSelectMode}>
                          Select multiple…
                        </DropdownMenuItem>
                      ) : null}
                      {onRemovePage ? (
                        <DropdownMenuItem
                          onSelect={() => onRemovePage(page)}
                          className="u-destructive"
                        >
                          Delete from group
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
