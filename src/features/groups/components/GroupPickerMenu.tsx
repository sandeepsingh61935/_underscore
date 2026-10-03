/**
 * @file GroupPickerMenu.tsx
 * @description Home "This page" group picker (plan Phase 1 Task 1.8).
 *
 * Radix menu (keyboard-operable) anchored to the GroupChip. Offers
 * "Add this page to..." and "Add whole domain to..." sub-menus over the
 * live groups, a "New group..." item (the Task 1.7 NewGroupDialog, owned
 * by the caller), and the current memberships with Remove — domain-rule
 * memberships annotated "via <host>". Item ids for Remove resolve through
 * the Task 1.2 helpers (normalizePageUrl / matchesDomainRule), the same
 * semantics as membershipsForUrl behind GROUP_MEMBERSHIP_FOR_URL.
 *
 * Body/popup-safe: V2 tokens only, 44px targets (menu items via
 * `--control-h`, Remove buttons explicit).
 */

import React, { useMemo, useState } from 'react';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import {
  matchesDomainRule,
  type UrlMembership,
} from '@/shared/utils/group-membership';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';

/**
 * Resolve the live item backing a membership so Remove can call
 * `removeItem(groupId, itemId)`. Explicit page items win over domain
 * rules, mirroring membershipsForUrl. Returns null when nothing live
 * matches (caller hides Remove for that row).
 */
export function findMembershipItemId(
  url: string,
  groupId: string,
  viaHostname: string | null,
  items: PageGroupItem[]
): string | null {
  const live = items.filter(
    (item) => item.groupId === groupId && item.deletedAt === null
  );
  const key = normalizePageUrl(url);
  const explicit = live.find(
    (item) => item.kind === 'page' && normalizePageUrl(item.urlNormalized) === key
  );
  if (explicit) return explicit.id;
  if (viaHostname !== null) {
    const via = live.find(
      (item) => item.kind === 'domain' && matchesDomainRule(key, item)
    );
    return via ? via.id : null;
  }
  return null;
}

export interface GroupPickerMenuProps {
  url: string;
  groups: PageGroup[];
  items: PageGroupItem[];
  memberships: UrlMembership[];
  onAddPage: (groupId: string) => void;
  onAddDomain: (groupId: string) => void;
  onRemoveItem: (groupId: string, itemId: string) => void;
  onNewGroup: () => void;
  children: React.ReactNode;
}

function GroupDot({ color }: { color: PageGroup['color'] }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        flexShrink: 0,
        borderRadius: 'var(--radius)',
        background: `var(--group-${color})`,
      }}
    />
  );
}

export function GroupPickerMenu({
  url,
  groups,
  items,
  memberships,
  onAddPage,
  onAddDomain,
  onRemoveItem,
  onNewGroup,
  children,
}: GroupPickerMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  const liveGroups = useMemo(
    () => groups.filter((group) => group.deletedAt === null),
    [groups]
  );

  const membershipRows = useMemo(
    () =>
      memberships.map((membership) => ({
        membership,
        itemId: findMembershipItemId(
          url,
          membership.group.id,
          membership.viaHostname,
          items
        ),
      })),
    [memberships, url, items]
  );

  const groupOptions = (
    onSelect: (groupId: string) => void,
    testIdPrefix: string
  ): React.ReactNode =>
    liveGroups.length === 0 ? (
      <DropdownMenuItem disabled>No groups yet</DropdownMenuItem>
    ) : (
      liveGroups.map((group) => (
        <DropdownMenuItem
          key={group.id}
          data-testid={`${testIdPrefix}-${group.id}`}
          onSelect={() => onSelect(group.id)}
        >
          <GroupDot color={group.color} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {group.name}
          </span>
        </DropdownMenuItem>
      ))
    );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="menu-content-wide"
        aria-label="Page groups for this page"
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid="group-menu-add-page">
            Add this page to...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {groupOptions(onAddPage, 'group-menu-add-page')}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid="group-menu-add-domain">
            Add whole domain to...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {groupOptions(onAddDomain, 'group-menu-add-domain')}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem
          data-testid="group-menu-new-group"
          onSelect={onNewGroup}
        >
          New group...
        </DropdownMenuItem>
        {membershipRows.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>On this page</DropdownMenuLabel>
            {membershipRows.map(({ membership, itemId }) => (
              <div
                key={membership.group.id}
                role="group"
                aria-label={`${membership.group.name} membership`}
                data-testid={`group-membership-${membership.group.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  paddingLeft: 12,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--step-0)',
                    color: 'var(--ink)',
                  }}
                >
                  {membership.group.name}
                  {membership.viaHostname ? (
                    <span
                      className="u-mono"
                      style={{
                        marginLeft: 6,
                        fontSize: 'var(--step--1)',
                        color: 'var(--ink-3)',
                      }}
                    >
                      via {membership.viaHostname}
                    </span>
                  ) : null}
                </span>
                {itemId ? (
                  <button
                    type="button"
                    data-testid={`group-membership-remove-${membership.group.id}`}
                    onClick={() => onRemoveItem(membership.group.id, itemId)}
                    style={{
                      minHeight: '44px',
                      padding: '0 12px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--ink-3)',
                      fontSize: 'var(--step--1)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
