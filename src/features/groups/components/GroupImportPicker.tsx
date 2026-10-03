/**
 * @file GroupImportPicker.tsx
 * @description Dialog to select and import existing browser tab groups into Underscore.
 */

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { browser } from 'wxt/browser';

import { GROUPS_IMPORT_BROWSER_TABS } from '@/shared/schemas/message-schemas';
import { GROUP_COLORS, type GroupColor } from '@/shared/types/page-group';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import { Dialog } from '@/ui-system/components/primitives/Dialog';

export interface BrowserTabGroupItem {
  id: number;
  title: string;
  color: GroupColor;
  tabCount: number;
}

export interface GroupImportPickerProps {
  open: boolean;
  onClose: () => void;
  onImport?: (selectedIds: number[]) => Promise<void> | void;
  groups?: BrowserTabGroupItem[];
}

export function GroupImportPicker({
  open,
  onClose,
  onImport,
  groups: propGroups,
}: GroupImportPickerProps): React.ReactElement | null {
  const [tabGroups, setTabGroups] = useState<BrowserTabGroupItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (propGroups) {
      setTabGroups(propGroups);
      setSelectedIds(new Set(propGroups.map((g) => g.id)));
      return;
    }

    let mounted = true;
    setIsLoading(true);

    const loadBrowserGroups = async () => {
      try {
        const tabGroupsApi =
          (browser as any)?.tabGroups ?? (globalThis as any)?.chrome?.tabGroups;
        const tabsApi = (browser as any)?.tabs ?? (globalThis as any)?.chrome?.tabs;

        if (tabGroupsApi?.query) {
          const res = tabGroupsApi.query({});
          const bGroups: any[] =
            res && typeof res.then === 'function'
              ? await res
              : await new Promise((resolve) => tabGroupsApi.query({}, resolve));

          const items: BrowserTabGroupItem[] = [];
          for (const bg of bGroups || []) {
            let tabs: any[] = [];
            if (tabsApi?.query) {
              const tRes = tabsApi.query({ groupId: bg.id });
              tabs =
                tRes && typeof tRes.then === 'function'
                  ? await tRes
                  : await new Promise((resolve) =>
                      tabsApi.query({ groupId: bg.id }, resolve)
                    );
            }
            const color = (GROUP_COLORS as readonly string[]).includes(bg.color)
              ? (bg.color as GroupColor)
              : 'grey';
            items.push({
              id: bg.id,
              title: (bg.title || '').trim() || 'Untitled Group',
              color,
              tabCount: Array.isArray(tabs) ? tabs.length : 0,
            });
          }

          if (mounted) {
            setTabGroups(items);
            setSelectedIds(new Set(items.map((i) => i.id)));
          }
        }
      } catch {
        if (mounted) setTabGroups([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadBrowserGroups();

    return () => {
      mounted = false;
    };
  }, [open, propGroups]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      onClose();
      return;
    }

    setIsImporting(true);
    try {
      if (onImport) {
        await onImport(ids);
      } else {
        const runtime = (browser as any)?.runtime ?? (globalThis as any)?.chrome?.runtime;
        if (runtime?.sendMessage) {
          await new Promise<void>((resolve, reject) => {
            runtime.sendMessage(
              {
                type: GROUPS_IMPORT_BROWSER_TABS,
                payload: { browserGroupIds: ids },
                timestamp: Date.now(),
              },
              (res: any) => {
                if (res?.success === false) {
                  reject(new Error(res.error || 'Failed to import tab groups'));
                } else {
                  resolve();
                }
              }
            );
          });
        }
      }
      toast(`Imported ${ids.length} tab ${ids.length === 1 ? 'group' : 'groups'}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to import tab groups');
    } finally {
      setIsImporting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import browser tab groups"
      actions={
        <>
          <button
            type="button"
            data-testid="group-import-cancel"
            onClick={onClose}
            style={{
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
            Cancel
          </button>
          <button
            type="button"
            data-testid="group-import-confirm"
            disabled={selectedIds.size === 0 || isImporting}
            onClick={() => {
              void handleImport();
            }}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              fontSize: 'var(--step-0)',
              cursor: selectedIds.size === 0 || isImporting ? 'default' : 'pointer',
              opacity: selectedIds.size === 0 || isImporting ? 0.5 : 1,
            }}
          >
            {isImporting ? 'Importing…' : 'Import'}
          </button>
        </>
      }
    >
      <div data-testid="group-import-picker" style={{ padding: '4px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            margin: '0 0 12px',
          }}
        >
          <p
            className="u-sans"
            style={{
              margin: 0,
              fontSize: 'var(--step--1)',
              color: 'var(--ink-2)',
              lineHeight: 1.4,
            }}
          >
            Select tab groups to mirror in Underscore.
          </p>
          {tabGroups.length > 0 && (
            <span
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {selectedIds.size} of {tabGroups.length} selected
            </span>
          )}
        </div>
        {isLoading ? (
          <p
            className="u-sans"
            style={{
              margin: '16px 0',
              fontSize: 'var(--step--1)',
              color: 'var(--ink-3)',
            }}
          >
            Loading tab groups…
          </p>
        ) : tabGroups.length === 0 ? (
          <p
            className="u-sans"
            style={{
              margin: '16px 0',
              fontSize: 'var(--step--1)',
              color: 'var(--ink-3)',
            }}
          >
            No browser tab groups found.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {tabGroups.map((group) => {
              const checked = selectedIds.has(group.id);
              return (
                <label
                  key={group.id}
                  data-testid={`group-import-item-${group.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 6px',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius)',
                    background: checked ? 'var(--paper-2)' : 'transparent',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    data-testid={`group-import-checkbox-${group.id}`}
                    checked={checked}
                    onChange={() => toggleSelect(group.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <ColorSwatch color={group.color} size="sm" variant="solid" />
                  <span
                    className="u-sans"
                    style={{
                      flex: 1,
                      fontSize: 'var(--step-0)',
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {group.title}
                  </span>
                  <span
                    className="u-serif"
                    style={{
                      fontSize: 'var(--step--1)',
                      fontStyle: 'italic',
                      color: 'var(--ink-3)',
                      flexShrink: 0,
                    }}
                  >
                    {group.tabCount} {group.tabCount === 1 ? 'tab' : 'tabs'}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
