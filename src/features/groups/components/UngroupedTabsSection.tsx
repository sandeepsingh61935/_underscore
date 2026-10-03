/**
 * @file UngroupedTabsSection.tsx
 * @description Collapsible section listing open, ungrouped syncable tabs in the current window.
 */

import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useGroupHighlights } from '@/features/groups/hooks/useGroupHighlights';
import { useGroupMutations } from '@/features/groups/hooks/useGroupMutations';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { useUngroupedTabs, type UngroupedTab } from '@/features/groups/hooks/useUngroupedTabs';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { ColorSwatch } from '@/ui-system/components/primitives/ColorSwatch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';

export interface UngroupedTabsSectionProps {
  groups?: PageGroup[];
  tabs?: UngroupedTab[];
  onAddPage?: (
    groupId: string,
    page: { url: string; title: string | null; faviconUrl: string | null }
  ) => Promise<void> | void;
  defaultExpanded?: boolean;
}

export function UngroupedTabsSection({
  groups: propGroups,
  tabs: propTabs,
  onAddPage: propOnAddPage,
  defaultExpanded = true,
}: UngroupedTabsSectionProps): React.ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { groups: fetchedGroups } = useGroups();
  const { tabs: fetchedTabs } = useUngroupedTabs();
  const { addPage } = useGroupMutations();

  const groups = propGroups ?? fetchedGroups;
  const rawTabs = propTabs ?? fetchedTabs;
  const liveGroups = groups.filter((g) => g.deletedAt === null);

  const pseudoItems = React.useMemo<PageGroupItem[]>(() => {
    return rawTabs.map((tab) => ({
      id: String(tab.id),
      groupId: '',
      kind: 'page' as const,
      urlNormalized: tab.url,
      title: tab.title,
      faviconUrl: tab.favIconUrl ?? null,
      position: 'a0',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    }));
  }, [rawTabs]);

  const { highlights } = useGroupHighlights(pseudoItems);

  const highlightCountByUrl = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const h of highlights) {
      const key = normalizePageUrl(h.url);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [highlights]);

  const tabs = React.useMemo(() => {
    return rawTabs.filter((tab) => {
      const count = highlightCountByUrl.get(normalizePageUrl(tab.url)) ?? 0;
      return count > 0;
    });
  }, [rawTabs, highlightCountByUrl]);

  const handleAddToGroup = async (groupId: string, tab: UngroupedTab) => {
    const targetGroup = liveGroups.find((g) => g.id === groupId);
    try {
      if (propOnAddPage) {
        await propOnAddPage(groupId, {
          url: tab.url,
          title: tab.title,
          faviconUrl: tab.favIconUrl,
        });
      } else {
        const res = await addPage(groupId, {
          url: tab.url,
          title: tab.title,
          faviconUrl: tab.favIconUrl,
        });
        if (!res.success) {
          toast.error(res.error || 'Failed to add tab to group');
          return;
        }
      }
      toast(`Added to ${targetGroup?.name || 'group'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add tab to group');
    }
  };

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="ungrouped-tabs-section"
      style={{
        borderTop: '1px solid var(--rule-soft)',
        marginTop: 8,
        paddingTop: 8,
      }}
    >
      <button
        type="button"
        data-testid="ungrouped-tabs-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '6px 16px',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      >
        <span
          className="u-caps"
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--ink-3)',
            fontWeight: 500,
          }}
        >
          Ungrouped tabs ({tabs.length})
        </span>
        <ChevronDown
          size={14}
          data-testid="ungrouped-tabs-chevron"
          style={{
            color: 'var(--ink-3)',
            transform: isExpanded ? 'none' : 'rotate(-90deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {isExpanded && (
        <div data-testid="ungrouped-tabs-list" style={{ padding: '4px 0 8px' }}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              data-testid={`ungrouped-tab-row-${tab.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 16px',
                minHeight: '40px',
              }}
            >
              {tab.favIconUrl ? (
                <img
                  src={tab.favIconUrl}
                  alt=""
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 'var(--radius)',
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 'var(--radius)',
                    background: 'var(--rule-soft)',
                    flexShrink: 0,
                  }}
                />
              )}

              <span
                className="u-sans"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 'var(--step--1)',
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.title || tab.url}
              </span>

              {liveGroups.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      data-testid={`ungrouped-tab-menu-${tab.id}`}
                      style={{
                        minHeight: '30px',
                        padding: '0 8px',
                        border: '1px solid var(--rule)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--paper)',
                        color: 'var(--ink-2)',
                        fontSize: 'var(--step--2)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      Add to…
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {liveGroups.map((group) => (
                      <DropdownMenuItem
                        key={group.id}
                        data-testid={`add-to-group-${group.id}`}
                        onSelect={() => {
                          void handleAddToGroup(group.id, tab);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <ColorSwatch color={group.color} size="sm" variant="solid" />
                        <span>{group.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
