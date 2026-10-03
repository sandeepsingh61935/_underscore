/**
 * @file WebGroupItemRows.tsx
 * @description Page and domain-rule rows for the web group pane. Domain rows
 * expand to their resolved pages (`via:<host>`). Every row has a keyboard
 * operable menu: Move to top / up / down + Remove.
 *
 * Web-only: no `chrome.*` access. The web never closes tabs, so no
 * close-tabs affordance appears anywhere here.
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

export type WebItemMoveTarget = 'top' | 'up' | 'down';

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
}

function MenuButton({
  label,
  testId,
  children,
}: {
  label: string;
  testId: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-testid={testId}
          style={{
            minWidth: 44,
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            fontSize: 'var(--step-1)',
            flexShrink: 0,
          }}
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

function MoveMenuItems({
  onMove,
  onRemove,
  onStartSelectMode,
}: {
  onMove: (to: WebItemMoveTarget) => void;
  onRemove: () => void;
  onStartSelectMode?: () => void;
}): React.ReactElement {
  return (
    <>
      {onStartSelectMode ? (
        <DropdownMenuItem onSelect={onStartSelectMode} onClick={onStartSelectMode}>
          Select multiple pages…
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onSelect={() => onMove('top')}>Move to top</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onMove('up')}>Move up</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onMove('down')}>Move down</DropdownMenuItem>
      <DropdownMenuItem onSelect={onRemove}>Remove</DropdownMenuItem>
    </>
  );
}

export interface WebGroupPageRowProps {
  item: Extract<PageGroupItem, { kind: 'page' }>;
  highlightCount: number;
  onMove: (to: WebItemMoveTarget) => void;
  onRemove: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onStartSelectMode?: () => void;
}

export function WebGroupPageRow({
  item,
  highlightCount,
  onMove,
  onRemove,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onStartSelectMode,
}: WebGroupPageRowProps): React.ReactElement {
  const title = item.title ?? item.urlNormalized;
  const host = hostnameOf(item.urlNormalized);
  const letter = (title.trim().charAt(0) || host.charAt(0) || '?').toUpperCase();

  return (
    <div
      className="domain-item"
      data-testid={`web-group-item-row-${item.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid var(--rule-soft)',
        minHeight: 44,
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div
        className="domain-main"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          minHeight: 44,
          cursor: 'default',
          minWidth: 0,
          padding: 0,
        }}
      >
        {isSelectMode ? (
          <input
            type="checkbox"
            data-testid={`web-group-item-select-${item.id}`}
            aria-label={`Select ${title}`}
            checked={Boolean(isSelected)}
            onChange={onToggleSelect}
            style={{
              width: 16,
              height: 16,
              cursor: 'pointer',
              flexShrink: 0,
              accentColor: 'var(--accent)',
            }}
          />
        ) : null}
        {item.faviconUrl ? (
          <img
            src={item.faviconUrl}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{ width: 16, height: 16, flexShrink: 0, borderRadius: 'var(--radius)' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="u-serif"
            style={{
              width: 16,
              height: 16,
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
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="title"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {title}
          </div>
          <div
            className="u-mono sub"
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {host}
          </div>
        </div>
        <span
          className="u-serif"
          style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)', flexShrink: 0 }}
        >
          {highlightCount}
        </span>
        <MenuButton label={`Actions for ${title}`} testId={`web-group-item-menu-${item.id}`}>
          <MoveMenuItems onMove={onMove} onRemove={onRemove} onStartSelectMode={onStartSelectMode} />
        </MenuButton>
      </div>
    </div>
  );
}

export interface WebGroupDomainRowProps {
  item: Extract<PageGroupItem, { kind: 'domain' }>;
  matchedPages: ResolvedGroupPage[];
  highlightCount: number;
  highlightCountForUrl?: (urlNormalized: string) => number;
  onMove: (to: WebItemMoveTarget) => void;
  onRemove: () => void;
  isSelectMode?: boolean;
  isPageSelected?: (urlNormalized: string) => boolean;
  onTogglePageSelect?: (urlNormalized: string) => void;
  onStartSelectMode?: () => void;
  onRemoveDomainPage?: (page: ResolvedGroupPage) => void;
}

export function WebGroupDomainRow({
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
  onRemoveDomainPage,
}: WebGroupDomainRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const letter = (item.hostname.trim().charAt(0) || '?').toUpperCase();

  return (
    <div
      className="domain-item"
      data-testid={`web-group-domain-row-${item.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid var(--rule-soft)',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div
        className="domain-main"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          width: '100%',
          minHeight: 44,
          cursor: 'default',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-label={`${item.hostname}, ${matchedPages.length} pages`}
          data-testid={`web-group-domain-toggle-${item.id}`}
          style={{
            width: 28,
            height: 28,
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
            flexShrink: 0,
            padding: 0,
          }}
        >
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </button>
        <span
          aria-hidden="true"
          className="u-serif"
          style={{
            width: 16,
            height: 16,
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
            style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {item.hostname}
          </div>
          <div className="sub">
            {item.includeSubdomains ? 'domain + subdomains' : 'domain'} ·{' '}
            {matchedPages.length} {matchedPages.length === 1 ? 'page' : 'pages'}
          </div>
        </div>
        <span
          className="u-serif"
          style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)', flexShrink: 0 }}
        >
          {highlightCount}
        </span>
        <MenuButton label={`Actions for ${item.hostname}`} testId={`web-group-domain-menu-${item.id}`}>
          <MoveMenuItems onMove={onMove} onRemove={onRemove} />
        </MenuButton>
      </div>
      {expanded ? (
        <div
          data-testid={`web-group-domain-pages-${item.id}`}
          style={{
            padding: '4px 16px 12px 52px',
            background: 'var(--paper-2)',
            borderTop: '1px solid var(--rule-soft)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {matchedPages.length === 0 ? (
            <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>
              No saved pages match this rule yet.
            </div>
          ) : (
            matchedPages.map((page) => (
              <div
                key={page.urlNormalized}
                data-testid={`web-group-domain-page-row-${encodeURIComponent(page.urlNormalized)}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: '44px',
                  borderTop: '1px solid var(--rule-soft)',
                }}
              >
                {isSelectMode ? (
                  <input
                    type="checkbox"
                    data-testid={`web-group-domain-page-select-${encodeURIComponent(page.urlNormalized)}`}
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
                    style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-3)', flexShrink: 0 }}
                  >
                    {highlightCountForUrl(page.urlNormalized)}
                  </span>
                ) : null}
                <MenuButton
                  label={`Actions for ${page.title ?? page.urlNormalized}`}
                  testId={`web-group-domain-page-menu-${encodeURIComponent(page.urlNormalized)}`}
                >
                  {onStartSelectMode ? (
                    <DropdownMenuItem onSelect={onStartSelectMode} onClick={onStartSelectMode}>
                      Select multiple pages…
                    </DropdownMenuItem>
                  ) : null}
                  {onRemoveDomainPage ? (
                    <DropdownMenuItem
                      className="u-destructive"
                      onSelect={() => onRemoveDomainPage(page)}
                      onClick={() => onRemoveDomainPage(page)}
                    >
                      Delete from group
                    </DropdownMenuItem>
                  ) : null}
                </MenuButton>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
