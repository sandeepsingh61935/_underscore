/**
 * @file WebGroupImportDialog.tsx
 * @description Dialog to import active browser tab groups into Underscore via the extension bridge.
 * Supports checkbox selection, tab count display, non-HTTP skipped badges, and smart-merging with
 * existing groups of identical name and color.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { PageGroup } from '@/shared/types/page-group';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import { Dialog } from '@/ui-system/components/primitives/Dialog';
import {
  getBrowserTabGroups,
  type BrowserTabGroupSummary,
} from '@/web/lib/extension-bridge';
import type { WebGroupRepository } from '@/web/hooks/useWebGroups';
import type { GroupChildPage } from './WebGroupsRailSection';

export interface WebGroupImportDialogProps {
  open: boolean;
  onClose: () => void;
  existingGroups: PageGroup[];
  repository: WebGroupRepository;
  availablePages?: GroupChildPage[];
  onImported?: () => void | Promise<void>;
  /** Optional mock groups for testing without postMessage */
  mockGroups?: BrowserTabGroupSummary[];
}

export function WebGroupImportDialog({
  open,
  onClose,
  existingGroups,
  repository,
  availablePages,
  onImported,
  mockGroups,
}: WebGroupImportDialogProps): React.ReactElement | null {
  const [tabGroups, setTabGroups] = useState<BrowserTabGroupSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [importStatus, setImportStatus] = useState<
    Record<number, 'pending' | 'importing' | 'completed' | 'error'>
  >({});
  const [importProgressText, setImportProgressText] = useState('');
  const [importPercent, setImportPercent] = useState(0);
  const [errorMessages, setErrorMessages] = useState<Record<number, string>>({});

  const highlightUrlSet = useMemo(() => {
    if (!availablePages) return null;
    return new Set(availablePages.map((p) => normalizePageUrl(p.urlNormalized).toLowerCase()));
  }, [availablePages]);

  const loadTabGroups = useCallback(() => {
    if (mockGroups) {
      setTabGroups(mockGroups);
      setSelectedIds(new Set(mockGroups.map((g) => g.id)));
      setPermissionError(false);
      return;
    }

    setIsLoading(true);
    setPermissionError(false);

    getBrowserTabGroups()
      .then((res) => {
        if (res.ok && res.groups) {
          setTabGroups(res.groups);
          setSelectedIds(new Set(res.groups.map((g) => g.id)));
          setPermissionError(false);
        } else {
          if (res.error && res.error.toLowerCase().includes('permission')) {
            setPermissionError(true);
          } else {
            toast.error(res.error ?? 'Failed to load browser tab groups');
          }
          setTabGroups([]);
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Bridge error');
        setTabGroups([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [mockGroups]);

  useEffect(() => {
    if (!open) return;
    loadTabGroups();
  }, [open, loadTabGroups]);

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
        const tabsToImport = highlightUrlSet
          ? group.validUrls.filter((url) =>
              highlightUrlSet.has(normalizePageUrl(url).toLowerCase())
            )
          : group.validUrls;

        setImportStatus((prev) => ({ ...prev, [group.id]: 'importing' }));
        setImportProgressText(
          `Importing group ${idx + 1} of ${selected.length}: "${group.title}"… (0/${tabsToImport.length} tabs)`
        );
        setImportPercent(Math.round((idx / selected.length) * 100));

        try {
          // Smart-merge: check if existing group has same name and color
          const cleanName = group.title.trim().toLowerCase();
          let targetGroup = existingGroups.find(
            (g) => g.name.trim().toLowerCase() === cleanName && g.color === group.color
          );

          if (!targetGroup) {
            targetGroup = await repository.createGroup({
              name: group.title,
              color: group.color,
            });
          }

          // Fetch existing items in target group to prevent duplicate URLs
          const existingItems = await repository.listItems(targetGroup.id);
          const existingUrls = new Set(
            existingItems
              .filter((i) => i.kind === 'page' && i.deletedAt === null)
              .map((i) => (i.kind === 'page' ? i.urlNormalized.toLowerCase() : ''))
          );

          for (let uIdx = 0; uIdx < tabsToImport.length; uIdx++) {
            const url = tabsToImport[uIdx]!;
            setImportProgressText(
              `Importing group ${idx + 1} of ${selected.length}: "${group.title}"… (${uIdx + 1}/${tabsToImport.length} tabs)`
            );
            setImportPercent(
              Math.round(
                ((idx + (uIdx + 1) / Math.max(tabsToImport.length, 1)) / selected.length) * 100
              )
            );

            if (!existingUrls.has(url.toLowerCase())) {
              await repository.addPage(targetGroup.id, url);
              existingUrls.add(url.toLowerCase());
            }
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
      maxWidth={460}
      actions={
        isCompleted ? (
          <button
            type="button"
            className="btn primary sm"
            onClick={onClose}
            data-testid="web-group-import-done"
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
              data-testid="web-group-import-cancel"
            >
              {permissionError ? 'Close' : 'Cancel'}
            </button>
            {!permissionError && (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => void handleImport()}
                disabled={selectedIds.size === 0 || isImporting || isLoading}
                data-testid="web-group-import-submit"
              >
                {isImporting
                  ? 'Importing…'
                  : `Import ${selectedIds.size} ${selectedIds.size === 1 ? 'group' : 'groups'}`}
              </button>
            )}
          </>
        )
      }
    >
      <div
        data-testid="web-group-import-dialog"
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
            data-testid="web-group-import-progress-container"
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
              <span data-testid="web-group-import-progress-text">{importProgressText}</span>
              <span className="u-mono" data-testid="web-group-import-progress-percent">
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
                data-testid="web-group-import-progress-bar"
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
            data-testid="web-group-import-completion"
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
        ) : permissionError ? (
          <div
            data-testid="web-group-import-permission-notice"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius)',
              background: 'var(--paper-2)',
              border: '1px solid var(--rule-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div
              className="u-serif"
              style={{
                fontSize: 'var(--step-0)',
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              Extension permission required
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
              Chrome requires permission before Underscore can access your browser tab groups.
            </p>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink)',
                lineHeight: 1.55,
              }}
            >
              <span style={{ fontWeight: 600 }}>How to enable:</span>
              <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>
                  Click the <strong>Underscore extension icon</strong> in your browser toolbar (top-right of Chrome)
                </li>
                <li>
                  In the popup, go to <strong>Settings</strong> (gear icon) and toggle on <strong>Browser tab groups</strong> (or open <strong>Library</strong> → <strong>Groups</strong> and click <strong>Enable tab sync</strong>)
                </li>
                <li>
                  Click <strong>Allow</strong> in the Chrome permission prompt
                </li>
              </ol>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 2 }}>
              <button
                type="button"
                className="btn ghost sm"
                onClick={loadTabGroups}
                data-testid="web-group-import-retry"
              >
                Check again
              </button>
            </div>
          </div>
        ) : tabGroups.length === 0 ? (
          <p
            data-testid="web-group-import-empty"
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
                  data-testid={`web-group-import-item-${group.id}`}
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
                      data-testid={`web-group-import-checkbox-${group.id}`}
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
                      {highlightUrlSet ? (
                        (() => {
                          const underscoredCount = group.validUrls.filter((url) =>
                            highlightUrlSet.has(normalizePageUrl(url).toLowerCase())
                          ).length;
                          const skippedHighlightsCount = group.validUrls.length - underscoredCount;
                          return (
                            <>
                              <span>
                                {underscoredCount} {underscoredCount === 1 ? 'tab' : 'tabs'} with highlights
                              </span>
                              {skippedHighlightsCount > 0 ? (
                                <span
                                  style={{ marginLeft: 6, fontStyle: 'italic' }}
                                  data-testid={`web-group-unhighlighted-badge-${group.id}`}
                                >
                                  ({skippedHighlightsCount} without highlights skipped)
                                </span>
                              ) : null}
                              {group.skippedCount > 0 ? (
                                <span
                                  style={{ marginLeft: 6, fontStyle: 'italic' }}
                                  data-testid={`web-group-skipped-badge-${group.id}`}
                                >
                                  ({group.skippedCount} non-web skipped)
                                </span>
                              ) : null}
                            </>
                          );
                        })()
                      ) : (
                        <>
                          {group.tabCount} {group.tabCount === 1 ? 'tab' : 'tabs'}
                          {group.skippedCount > 0 ? (
                            <span
                              style={{ marginLeft: 6, fontStyle: 'italic' }}
                              data-testid={`web-group-skipped-badge-${group.id}`}
                            >
                              ({group.skippedCount} non-web skipped)
                            </span>
                          ) : null}
                        </>
                      )}
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
                      {highlightUrlSet
                        ? group.validUrls.filter((url) =>
                            highlightUrlSet.has(normalizePageUrl(url).toLowerCase())
                          ).length
                        : group.validUrls.length}{' '}
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
