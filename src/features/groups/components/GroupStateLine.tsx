/**
 * @file GroupStateLine.tsx
 * @description Secondary state line under a group name showing device and binding state.
 */

import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import type { PageGroup } from '@/shared/types/page-group';

export interface GroupStateLineProps {
  group: PageGroup;
  currentDeviceId?: string | null;
  tabCount?: number;
}

export function formatRelativeTime(dateOrIso: string | Date, nowMs = Date.now()): string {
  const ts = typeof dateOrIso === 'string' ? new Date(dateOrIso).getTime() : dateOrIso.getTime();
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const diffMs = Math.max(0, nowMs - ts);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) {
    const m = Math.max(1, Math.floor(diffMs / minute));
    return `${m}m ago`;
  }
  if (diffMs < day) {
    const h = Math.max(1, Math.floor(diffMs / hour));
    return `${h}h ago`;
  }
  const d = Math.max(1, Math.floor(diffMs / day));
  return `${d}d ago`;
}

function browserLabel(b: PageGroup['boundBrowser']): string {
  switch (b) {
    case 'firefox':
      return 'Firefox';
    case 'edge':
      return 'Edge';
    case 'chrome':
      return 'Chrome';
    default:
      return 'Chrome';
  }
}

export function GroupStateLine({
  group,
  currentDeviceId: propCurrentDeviceId,
  tabCount,
}: GroupStateLineProps): React.ReactElement | null {
  const [localDeviceId, setLocalDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (propCurrentDeviceId !== undefined) return;
    try {
      const storage =
        (globalThis as any)?.chrome?.storage?.local ?? (browser as any)?.storage?.local;
      if (storage?.get) {
        storage.get(['underscore_device_id'], (res: Record<string, any>) => {
          if (res?.['underscore_device_id']) {
            setLocalDeviceId(res['underscore_device_id']);
          }
        });
      }
    } catch {
      // Ignore storage read error
    }
  }, [propCurrentDeviceId]);

  const currentDeviceId = propCurrentDeviceId ?? localDeviceId;

  const isLiveOnThisDevice = Boolean(
    group.boundDeviceId &&
      ((currentDeviceId && group.boundDeviceId === currentDeviceId) ||
        group.boundDeviceLabel === 'this device')
  );

  const isLiveElsewhere = Boolean(
    group.boundDeviceId &&
      !isLiveOnThisDevice
  );

  let text: string | null = null;

  if (isLiveOnThisDevice) {
    const bName = browserLabel(group.boundBrowser);
    const countPart =
      typeof tabCount === 'number'
        ? ` · ${tabCount} ${tabCount === 1 ? 'tab' : 'tabs'}`
        : '';
    text = `Live in ${bName} on this device${countPart}`;
  } else if (isLiveElsewhere) {
    const label = group.boundDeviceLabel || 'another device';
    text = `Live on ${label}`;
  } else if (group.boundDeviceId === null) {
    if (group.boundAt) {
      const relative = formatRelativeTime(group.boundAt);
      text = `Closed · last open ${relative}`;
    } else {
      return null;
    }
  }

  if (!text) return null;

  return (
    <div
      className="u-sans"
      data-testid="group-state-line"
      style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.4 }}
    >
      {text}
    </div>
  );
}
