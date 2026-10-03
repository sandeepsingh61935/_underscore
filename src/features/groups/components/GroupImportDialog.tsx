/**
 * @file GroupImportDialog.tsx
 * @description Extension dialog to import browser tab groups into Underscore.
 * Includes progress bar, checklist row status badges, and completion screen.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { browser } from 'wxt/browser';

import { useGroupHighlights } from '@/features/groups/hooks/useGroupHighlights';
import { useGroupMutations } from '@/features/groups/hooks/useGroupMutations';
import { useGroups } from '@/features/groups/hooks/useGroups';
import {
  GROUP_COLORS,
  type GroupColor,
  type PageGroupItem,
} from '@/shared/types/page-group';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import { Dialog } from '@/ui-system/components/primitives/Dialog';

export interface BrowserTabGroupInfo {
  id: number;
  title: string;
  color: GroupColor;
  tabCount: number;
  validUrls: string[];
  skippedCount: number;
}

export interface GroupImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void | Promise<void>;
  mockGroups?: BrowserTabGroupInfo[];
  highlightUrls?: Set<string> | string[];
}

export function GroupImportDialog({
  open,
  onClose,
  onImported,
  mockGroups,
  highlightUrls: propHighlightUrls,
}: GroupImportDialogProps): React.ReactElement | null {
  const [tabGroups, setTabGroups] = useState<BrowserTabGroupInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [importStatus, setImportStatus] = useState<
    Record<number, 'pending' | 'importing' | 'completed' | 'error'>
  >({});
  const [importProgressText, setImportProgressText] = useState('');
  const [importPercent, setImportPercent] = useState(0);
  const [errorMessages, setErrorMessages] = useState<Record<number, string>>({});

  const { refetch } = useGroups();
  const mutations = useGroupMutations();

  const pseudoItems = useMemo<PageGroupItem[]>(() => {
    const allUrls = tabGroups.flatMap((g) => g.validUrls);
    return allUrls.map((url, idx) => ({
      id: `pseudo-${idx}`,
      groupId: '',
      kind: 'page' as const,
      urlNormalized: url,
      title: null,
      faviconUrl: null,
      position: `a${idx}`,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    }));
  }, [tabGroups]);

  const { highlights } = useGroupHighlights(pseudoItems);

  const highlightUrlSet = useMemo(() => {
    if (propHighlightUrls) {
      const set = new Set<string>();
      for (const u of propHighlightUrls) set.add(normalizePageUrl(u).toLowerCase());
      return set;
    }
    const set = new Set<string>();
    for (const h of highlights) {
      set.add(normalizePageUrl(h.url).toLowerCase());
    }
    return set;
  }, [propHighlightUrls, highlights]);

  const loadGroups = useCallback(async () => {
    if (mockGroups) {
      setTabGroups(mockGroups);
      setSelectedIds(new Set(mockGroups.map((g) => g.id)));
      return;
    }

    setIsLoading(true);
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

        const items: BrowserTabGroupInfo[] = [];
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
          const validUrls = (Array.isArray(tabs) ? tabs : [])
            .map((t) => t.url || '')
            .filter((u) => u.startsWith('http://') || u.startsWith('https://'));
          const skippedCount = (Array.isArray(tabs) ? tabs.length : 0) - validUrls.length;

          const color = (GROUP_COLORS as readonly string[]).includes(bg.color)
            ? (bg.color as GroupColor)
            : 'grey';

          items.push({
            id: bg.id,
            title: (bg.title || '').trim() || 'Untitled Group',
            color,
            tabCount: Array.isArray(tabs) ? tabs.length : 0,
            validUrls,
            skippedCount,
          });
        }

        setTabGroups(items);
        setSelectedIds(new Set(items.map((i) => i.id)));
      }
    } catch {
      setTabGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [mockGroups]);

  useEffect(() => {
    if (!open) return;
    setIsCompleted(false);
    setImportStatus({});
    setImportPercent(0);
    setImportProgressText('');
    void loadGroups();
  }, [open, loadGroups]);

  const toggleSelect = (id: number): void => {
    if (isImporting || isCompleted) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImport = async (): Promise<void> => {
    const selected = tabGroups.filter((g) => selectedIds.has(g.id));
    if (selected.length === 0) return;

    setIsImporting(true);
    setIsCompleted(false);

    const initialStatus: Record<number, 'pending' | 'importing' | 'completed' | 'error'> = {};
    for (const g of selected) {
      initialStatus[g.id] = 'pending';
    }
    setImportStatus(initialStatus);
    setImportPercent(0);

    try {
      let importedCount = 0;
      for (let idx = 0; idx < selected.length; idx++) {
        const group = selected[idx]!;
        const tabsToImport = group.validUrls.filter((url) =>
          highlightUrlSet.has(normalizePageUrl(url).toLowerCase())
        );

        setImportStatus((prev) => ({ ...prev, [group.id]: 'importing' }));
        setImportProgressText(
          `Importing group ${idx + 1} of ${selected.length}: "${group.title}"… (0/${tabsToImport.length} tabs)`
        );
        setImportPercent(Math.round((idx / selected.length) * 100));

        try {
          const createRes = await mutations.createGroup(group.title, group.color);
          if (createRes.success && createRes.data?.group) {
            const targetId = createRes.data.group.id;
            for (let uIdx = 0; uIdx < tabsToImport.length; uIdx++) {
              const url = tabsToImport[uIdx]!;
              setImportProgressText(
                `Importing group ${idx + 1} of ${selected.length}: "${group.title}"… (${uIdx + 1}/${tabsToImport.length} tabs)`
              );
              setImportPercent(
                Math.round(
                  ((idx + (uIdx + 1) / Math.max(tabsToImport.length, 1)) /
                    selected.length) *
                    100
                )
              );
              await mutations.addPage(targetId, { url });
            }
          } else {
            throw new Error(createRes.error || 'Failed to import tab group');
          }

          setImportStatus((prev) => ({ ...prev, [group.id]: 'completed' }));
          importedCount++;
        } catch (err) {
          setImportStatus((prev) => ({ ...prev, [group.id]: 'error' }));
          setErrorMessages((prev) => ({
            ...prev,
            [group.id]: err instanceof Error ? err.message : 'Import failed',
          }));
        }
      }

      setImportPercent(100);
      setIsCompleted(true);
      toast.success(
        `Imported ${importedCount} tab ${importedCount === 1 ? 'group' : 'groups'}`
      );
      void refetch();
      if (onImported) {
        await onImported();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import groups');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Import from browser"
      maxWidth={420}
      actions={
        isCompleted ? (
          <button
            type="button"
            className="btn primary sm"
            onClick={onClose}
            data-testid="group-import-done"
            data-od-id="group-import-done"
          >
            Done
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn ghost sm"
              onClick={onClose}
              disabled={isImporting}
              data-testid="group-import-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => void handleImport()}
              disabled={selectedIds.size === 0 || isImporting || isLoading}
              data-testid="group-import-submit"
            >
              {isImporting
                ? 'Importing…'
                : `Import ${selectedIds.size} ${selectedIds.size === 1 ? 'group' : 'groups'}`}
            </button>
          </>
        )
      }
    >
      <div
        data-testid="group-import-dialog"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
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
          Select tab groups currently open in your browser to import into Underscore.
        </p>

        {isImporting && (
          <div
            data-testid="group-import-progress-container"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '10px 12px',
              background: 'var(--paper-2)',
              border: '1px solid var(--rule-soft)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 'var(--step--1)',
                color: 'var(--ink-2)',
              }}
            >
              <span data-testid="group-import-progress-text">{importProgressText}</span>
              <span className="u-mono" data-testid="group-import-progress-percent">
                {importPercent}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--rule-soft)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                data-testid="group-import-progress-bar"
                style={{
                  height: '100%',
                  width: `${importPercent}%`,
                  background: 'var(--accent)',
                  transition: 'width 0.15s ease',
                }}
              />
            </div>
          </div>
        )}

        {isCompleted && (
          <div
            data-testid="group-import-completion"
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius)',
              background: 'var(--paper-2)',
              border: '1px solid var(--rule-soft)',
              color: 'var(--ink)',
              fontSize: 'var(--step--1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--accent-2, green)', fontWeight: 600 }}>✓</span>
            <span>All selected groups imported successfully.</span>
          </div>
        )}

        {isLoading ? (
          <p
            className="u-sans"
            style={{
              margin: '16px 0',
              fontSize: 'var(--step-0)',
              color: 'var(--ink-3)',
              textAlign: 'center',
            }}
          >
            Checking browser tab groups…
          </p>
        ) : tabGroups.length === 0 ? (
          <p
            data-testid="group-import-empty"
            className="u-sans"
            style={{
              margin: '16px 0',
              fontSize: 'var(--step-0)',
              color: 'var(--ink-3)',
              textAlign: 'center',
            }}
          >
            No active tab groups found in your browser.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 260,
              overflowY: 'auto',
              border: '1px solid var(--rule-soft)',
              borderRadius: 'var(--radius)',
              padding: 8,
            }}
          >
            {tabGroups.map((group) => {
              const checked = selectedIds.has(group.id);
              const status = importStatus[group.id];
              return (
                <div
                  key={group.id}
                  data-testid={`group-import-item-${group.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: checked ? 'var(--paper-2)' : 'transparent',
                    cursor: isImporting || isCompleted ? 'default' : 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => {
                    if (!isImporting && !isCompleted) toggleSelect(group.id);
                  }}
                >
                  {status ? (
                    <div
                      style={{
                        width: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {status === 'pending' && (
                        <span
                          data-testid={`group-status-pending-${group.id}`}
                          style={{ color: 'var(--ink-3)', fontSize: 'var(--step-0)' }}
                        >
                          —
                        </span>
                      )}
                      {status === 'importing' && (
                        <span
                          data-testid={`group-status-importing-${group.id}`}
                          style={{
                            color: 'var(--accent)',
                            fontSize: 'var(--step--1)',
                            display: 'inline-block',
                          }}
                        >
                          ◌
                        </span>
                      )}
                      {status === 'completed' && (
                        <span
                          data-testid={`group-status-completed-${group.id}`}
                          style={{ color: 'var(--accent-2, green)', fontWeight: 600 }}
                        >
                          ✓
                        </span>
                      )}
                      {status === 'error' && (
                        <span
                          data-testid={`group-status-error-${group.id}`}
                          style={{ color: 'var(--ttl-expired, red)', fontWeight: 600 }}
                        >
                          ✕
                        </span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isImporting || isCompleted}
                      onChange={() => toggleSelect(group.id)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`group-import-checkbox-${group.id}`}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                    />
                  )}
                  <ColorSwatch color={group.color} size="sm" variant="solid" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="u-serif"
                      style={{
                        fontSize: 'var(--step-0)',
                        fontWeight: 500,
                        color: 'var(--ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {group.title}
                    </div>
                    <div
                      className="u-mono"
                      style={{
                        fontSize: 'var(--step--2)',
                        color: 'var(--ink-3)',
                      }}
                    >
                      {(() => {
                        const count = group.validUrls.filter((url) =>
                          highlightUrlSet.has(normalizePageUrl(url).toLowerCase())
                        ).length;
                        return (
                          <>
                            <span>{count} with highlights</span>
                            {group.skippedCount > 0 ? (
                              <span
                                style={{ marginLeft: 6, fontStyle: 'italic' }}
                                data-testid={`group-skipped-badge-${group.id}`}
                              >
                                ({group.skippedCount} non-web skipped)
                              </span>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {status === 'importing' && (
                    <span
                      style={{
                        fontSize: 'var(--step--2)',
                        color: 'var(--accent)',
                        fontWeight: 500,
                      }}
                    >
                      Importing…
                    </span>
                  )}
                  {status === 'completed' && (
                    <span
                      style={{
                        fontSize: 'var(--step--2)',
                        color: 'var(--accent-2, green)',
                        fontWeight: 500,
                      }}
                    >
                      Imported (
                      {
                        group.validUrls.filter((url) =>
                          highlightUrlSet.has(normalizePageUrl(url).toLowerCase())
                        ).length
                      }{' '}
                      pages)
                    </span>
                  )}
                  {status === 'error' && (
                    <span
                      style={{
                        fontSize: 'var(--step--2)',
                        color: 'var(--ttl-expired, red)',
                        fontWeight: 500,
                      }}
                    >
                      {errorMessages[group.id] || 'Error'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}
