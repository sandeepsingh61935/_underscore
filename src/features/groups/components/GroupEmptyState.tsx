/**
 * @file GroupEmptyState.tsx
 * @description No-groups empty state per PRD Empty/guest table.
 * Includes dismissible browser tab sync nudge (Phase 3.6).
 */

import React, { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import { useBrowserTabSync } from '@/features/groups/hooks/useBrowserTabSync';

export const GROUPS_EMPTY_COPY = "Group pages and domains you're working across.";
export const GROUPS_GUEST_COPY =
  'Groups are saved on this device. Sign in to sync them to the web app.';

export interface GroupEmptyStateProps {
  isAuthenticated: boolean;
  onNewGroup: () => void;
  onSignIn?: () => void;
  onOpenSettings?: () => void;
  isSyncSupported?: boolean;
  isSyncEnabled?: boolean;
}

export function GroupEmptyState({
  isAuthenticated,
  onNewGroup,
  onSignIn,
  onOpenSettings,
  isSyncSupported,
  isSyncEnabled,
}: GroupEmptyStateProps): React.ReactElement {
  const [isDismissed, setIsDismissed] = useState(false);
  const syncState = useBrowserTabSync();

  const isSupported = isSyncSupported ?? syncState.isSupported;
  const isEnabled = isSyncEnabled ?? syncState.isEnabled;

  useEffect(() => {
    try {
      const storage =
        (browser as any)?.storage?.local ?? (globalThis as any)?.chrome?.storage?.local;
      if (storage?.get) {
        const raw = storage.get(['groups_sync_nudge_dismissed']);
        if (raw && typeof raw.then === 'function') {
          raw.then((res: Record<string, any>) => {
            if (res?.['groups_sync_nudge_dismissed']) {
              setIsDismissed(true);
            }
          });
        } else {
          storage.get(['groups_sync_nudge_dismissed'], (res: Record<string, any>) => {
            if (res?.['groups_sync_nudge_dismissed']) {
              setIsDismissed(true);
            }
          });
        }
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      const storage =
        (browser as any)?.storage?.local ?? (globalThis as any)?.chrome?.storage?.local;
      if (storage?.set) {
        storage.set({ groups_sync_nudge_dismissed: true });
      }
    } catch {
      // Ignore storage write error
    }
  };

  const showNudge = isSupported && !isEnabled && !isDismissed;

  return (
    <div
      data-testid="groups-empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        padding: '24px 16px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <p
        className="u-serif"
        style={{ margin: 0, fontSize: 'var(--step-1)', color: 'var(--ink)', lineHeight: 1.4 }}
      >
        {GROUPS_EMPTY_COPY}
      </p>
      <button
        type="button"
        data-testid="groups-empty-new"
        onClick={onNewGroup}
        style={{
          minHeight: '44px',
          padding: '0 24px',
          border: 'none',
          borderRadius: 'var(--radius)',
          background: 'var(--accent)',
          color: 'var(--accent-ink)',
          fontSize: 'var(--step-0)',
          cursor: 'pointer',
        }}
      >
        New group
      </button>
      {!isAuthenticated ? (
        <p
          className="u-sans"
          data-testid="groups-guest-copy"
          style={{ margin: 0, fontSize: 'var(--step-0)', color: 'var(--ink-2)', lineHeight: 1.5 }}
        >
          {GROUPS_GUEST_COPY}
          {onSignIn ? (
            <button
              type="button"
              data-testid="groups-guest-sign-in"
              onClick={onSignIn}
              style={{
                display: 'block',
                marginTop: 8,
                minHeight: '44px',
                padding: '0 16px',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 'var(--step-0)',
                cursor: 'pointer',
              }}
            >
              Sign in
            </button>
          ) : null}
        </p>
      ) : null}

      {showNudge && (
        <div
          data-testid="groups-sync-nudge"
          style={{
            marginTop: 8,
            padding: '12px 14px',
            background: 'var(--paper-2)',
            border: '1px solid var(--rule-soft)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 2,
              }}
            >
              Sync with your browser tab groups
            </div>
            <p
              className="u-sans"
              style={{
                margin: 0,
                fontSize: 'var(--step--1)',
                color: 'var(--ink-2)',
                lineHeight: 1.45,
              }}
            >
              Mirror tab groups in your browser with Underscore groups. Incognito is never included.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              data-testid="groups-sync-nudge-enable"
              onClick={async () => {
                await syncState.enableSync();
              }}
              style={{
                minHeight: '32px',
                padding: '0 12px',
                border: 'none',
                borderRadius: 'var(--radius)',
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                fontSize: 'var(--step--1)',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Enable tab sync
            </button>
            <button
              type="button"
              data-testid="groups-sync-nudge-settings"
              onClick={() => {
                if (onOpenSettings) {
                  onOpenSettings();
                } else {
                  try {
                    (browser as any)?.runtime?.openOptionsPage?.() ??
                      (globalThis as any)?.chrome?.runtime?.openOptionsPage?.();
                  } catch {}
                }
              }}
              style={{
                minHeight: '32px',
                padding: '0 12px',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 'var(--step--1)',
                cursor: 'pointer',
              }}
            >
              Settings
            </button>
            <button
              type="button"
              data-testid="groups-sync-nudge-dismiss"
              onClick={handleDismiss}
              style={{
                minHeight: '32px',
                padding: '0 12px',
                border: 'none',
                background: 'transparent',
                color: 'var(--ink-3)',
                fontSize: 'var(--step--1)',
                cursor: 'pointer',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
