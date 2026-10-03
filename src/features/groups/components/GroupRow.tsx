/**
 * @file GroupRow.tsx
 * @description Groups list row: color swatch + name + item count + state line.
 * The row itself is the disclosure (opens group detail). Manual groups show
 * no state line.
 */

import React from 'react';

import type { PageGroup } from '@/shared/types/page-group';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';

import { GroupStateLine } from './GroupStateLine';

export interface GroupRowProps {
  group: PageGroup;
  itemCount: number;
  onOpen: () => void;
  onRename?: () => void;
  onRecolor?: () => void;
  onDelete?: () => void;
}

export function GroupRow({
  group,
  itemCount,
  onOpen,
  onRename,
  onRecolor,
  onDelete,
}: GroupRowProps): React.ReactElement {
  const hasActions = Boolean(onRename || onRecolor || onDelete);

  return (
    <div className="domain-item" data-testid={`group-row-${group.id}`}>
      <button
        type="button"
        className="domain-main"
        onClick={onOpen}
        aria-label={group.name}
        style={{ minHeight: '44px' }}
      >
        <div style={{ marginTop: group.boundDeviceId ? 2 : 0, flexShrink: 0 }}>
          <ColorSwatch color={group.color} size="sm" variant="solid" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="title">{group.name}</div>
          <GroupStateLine group={group} tabCount={itemCount} />
        </div>
        <span
          className="u-serif"
          style={{
            fontSize: 16,
            fontStyle: 'italic',
            color: 'var(--ink-3)',
            flexShrink: 0,
            marginRight: hasActions ? 2 : 0,
          }}
        >
          {itemCount}
        </span>
      </button>
      {hasActions && (
        <div style={{ paddingRight: 8, display: 'flex', alignItems: 'center' }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${group.name}`}
                data-testid={`group-row-menu-${group.id}`}
                style={{
                  width: 32,
                  height: 32,
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
              {onRename && <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>}
              {onRecolor && <DropdownMenuItem onSelect={onRecolor}>Color</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
