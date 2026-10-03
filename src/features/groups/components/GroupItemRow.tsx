/**
 * @file GroupItemRow.tsx
 * @description Page row inside group detail: favicon (or letter tile), title
 * (or normalized URL), domain in `.u-mono`, highlight count, and a
 * DropdownMenu with Move to top / up / down + Remove. Keyboard operable via
 * the Radix menu; moves announce through the caller's aria-live region.
 */

import React from 'react';

import type { PageGroupItem } from '@/shared/types/page-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';

export type ItemMoveTarget = 'top' | 'up' | 'down';

export interface GroupItemRowProps {
  item: Extract<PageGroupItem, { kind: 'page' }>;
  highlightCount: number;
  onMove: (to: ItemMoveTarget) => void;
  onRemove: () => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onStartSelectMode?: () => void;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
}

export function GroupItemRow({
  item,
  highlightCount,
  onMove,
  onRemove,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onStartSelectMode,
}: GroupItemRowProps): React.ReactElement {
  const title = item.title ?? item.urlNormalized;
  const host = hostnameOf(item.urlNormalized);
  const letter = (title.trim().charAt(0) || host.charAt(0) || '?').toUpperCase();

  return (
    <div className="domain-item" data-testid={`group-item-row-${item.id}`}>
      <div className="domain-main" style={{ minHeight: '44px', cursor: 'default' }}>
        {isSelectMode ? (
          <input
            type="checkbox"
            data-testid={`group-item-select-checkbox-${item.id}`}
            aria-label={`Select ${title}`}
            checked={Boolean(isSelected)}
            onChange={onToggleSelect}
            style={{
              width: 16,
              height: 16,
              cursor: 'pointer',
              flexShrink: 0,
              marginRight: 6,
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
          <div className="title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </div>
          <div className="u-mono sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {host}
          </div>
        </div>
        <span
          className="u-serif"
          style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)', flexShrink: 0 }}
        >
          {highlightCount}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${title}`}
              data-testid={`group-item-menu-${item.id}`}
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
                flexShrink: 0,
                borderRadius: 'var(--radius)',
              }}
            >
              <span aria-hidden="true">⋯</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onStartSelectMode ? (
              <DropdownMenuItem onSelect={onStartSelectMode}>Select multiple…</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => onMove('top')}>Move to top</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove('up')}>Move up</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onMove('down')}>Move down</DropdownMenuItem>
            <DropdownMenuItem onSelect={onRemove} className="u-destructive">Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
