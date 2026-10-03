/**
 * @file GroupChip.tsx
 * @description Home "This page" group chip (plan Phase 1 Task 1.8).
 *
 * Label contract: "+ Group" (no membership), "In: X" (one group),
 * "In: X +N" (more). Wraps the Chip filter primitive (44px V2 target,
 * V2 tokens only) and forwards its ref so Radix can use it as a menu
 * trigger via `asChild`.
 */

import React, { forwardRef } from 'react';

import type { UrlMembership } from '@/shared/utils/group-membership';
import { Chip } from '@/ui-system/components/primitives/Chip';

export function groupChipLabel(memberships: UrlMembership[]): string {
  if (memberships.length === 0) return '+ Group';
  const first = memberships[0]?.group.name ?? 'group';
  if (memberships.length === 1) return `In: ${first}`;
  return `In: ${first} +${memberships.length - 1}`;
}

export interface GroupChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  memberships: UrlMembership[];
}

export const GroupChip = forwardRef<HTMLButtonElement, GroupChipProps>(
  function GroupChip({ memberships, ...rest }, ref) {
    return (
      <Chip
        ref={ref}
        variant="filter"
        data-testid="home-group-chip"
        {...rest}
      >
        {groupChipLabel(memberships)}
      </Chip>
    );
  }
);
