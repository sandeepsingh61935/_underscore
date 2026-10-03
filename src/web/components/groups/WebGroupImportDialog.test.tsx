/**
 * @file WebGroupImportDialog.test.tsx
 * @description Unit tests for WebGroupImportDialog (PRD 2026-09-29 §4).
 * Tests rendering open browser tab groups, selection toggling, non-web tab skip badge,
 * smart-merging with existing groups, and repository additions.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { BrowserTabGroupSummary } from '@/web/lib/extension-bridge';
import type { WebGroupRepository } from '@/web/hooks/useWebGroups';
import { getBrowserTabGroups } from '@/web/lib/extension-bridge';
import { WebGroupImportDialog } from './WebGroupImportDialog';

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), mockToast),
}));

vi.mock('@/web/lib/extension-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/web/lib/extension-bridge')>();
  return {
    ...actual,
    getBrowserTabGroups: vi.fn(),
  };
});

class MockRepository implements WebGroupRepository {
  groups: PageGroup[] = [];
  items: PageGroupItem[] = [];

  async listGroups(): Promise<PageGroup[]> {
    return this.groups;
  }
  async listItems(groupId: string): Promise<PageGroupItem[]> {
    return this.items.filter((i) => i.groupId === groupId);
  }
  async createGroup(input: { name: string; color: any }): Promise<PageGroup> {
    const group: PageGroup = {
      id: `group-${Date.now()}-${Math.random()}`,
      name: input.name,
      color: input.color,
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.groups.push(group);
    return group;
  }
  async renameGroup(): Promise<void> {}
  async recolorGroup(): Promise<void> {}
  async deleteGroup(): Promise<void> {}
  async restoreGroup(): Promise<void> {}
  async moveGroup(): Promise<void> {}
  async addPage(groupId: string, urlNormalized: string): Promise<PageGroupItem> {
    const created: PageGroupItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      groupId,
      kind: 'page',
      urlNormalized,
      title: null,
      faviconUrl: null,
      position: 'a0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.items.push(created);
    return created;
  }
  async addDomain(
    groupId: string,
    hostname: string,
    includeSubdomains: boolean
  ): Promise<PageGroupItem> {
    const created: PageGroupItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      groupId,
      kind: 'domain',
      hostname,
      includeSubdomains,
      position: 'a0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.items.push(created);
    return created;
  }
  async removeItem(): Promise<void> {}
  async restoreItem(): Promise<void> {}
  async moveItem(): Promise<void> {}
}

const mockGroups: BrowserTabGroupSummary[] = [
  {
    id: 1,
    title: 'Research Project',
    color: 'blue',
    tabCount: 3,
    validUrls: ['https://example.com/a', 'https://example.com/b'],
    skippedCount: 1,
  },
  {
    id: 2,
    title: 'Design Ideas',
    color: 'pink',
    tabCount: 2,
    validUrls: ['https://figma.com/file'],
    skippedCount: 0,
  },
];

describe('WebGroupImportDialog', () => {
  let repo: MockRepository;
  const onClose = vi.fn();
  const onImported = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new MockRepository();
  });

  it('renders active browser tab groups with titles, tab counts, and skipped badge', () => {
    render(
      <WebGroupImportDialog
        open={true}
        onClose={onClose}
        existingGroups={[]}
        repository={repo}
        mockGroups={mockGroups}
      />
    );

    expect(screen.getByText('Import from browser')).toBeInTheDocument();
    expect(screen.getByText('Research Project')).toBeInTheDocument();
    expect(screen.getByText('Design Ideas')).toBeInTheDocument();
    expect(screen.getByTestId('web-group-skipped-badge-1')).toHaveTextContent(
      '(1 non-web skipped)'
    );
    expect(screen.queryByTestId('web-group-skipped-badge-2')).not.toBeInTheDocument();
  });

  it('imports selected group into repository as new group', async () => {
    render(
      <WebGroupImportDialog
        open={true}
        onClose={onClose}
        existingGroups={[]}
        repository={repo}
        onImported={onImported}
        mockGroups={[mockGroups[0]!]}
      />
    );

    fireEvent.click(screen.getByTestId('web-group-import-submit'));

    await waitFor(() => {
      expect(repo.groups).toHaveLength(1);
    });

    expect(repo.groups[0]!.name).toBe('Research Project');
    expect(repo.groups[0]!.color).toBe('blue');
    expect(repo.items).toHaveLength(2);
    expect(repo.items.map((i) => (i.kind === 'page' ? i.urlNormalized : ''))).toEqual([
      'https://example.com/a',
      'https://example.com/b',
    ]);
    expect(mockToast.success).toHaveBeenCalledWith('Imported 1 tab group');
    expect(onImported).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId('web-group-import-done')).toBeInTheDocument();
    });
    expect(screen.getByTestId('web-group-import-completion')).toHaveTextContent(
      'All selected groups imported successfully.'
    );
    expect(screen.getByTestId('group-status-completed-1')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('web-group-import-done'));
    expect(onClose).toHaveBeenCalled();
  });

  it('smart-merges items into existing group when name and color match', async () => {
    const existingGroup: PageGroup = {
      id: 'existing-1',
      name: 'Research Project',
      color: 'blue',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    repo.groups.push(existingGroup);
    // Already has one of the URLs
    repo.items.push({
      id: 'item-existing',
      groupId: 'existing-1',
      kind: 'page',
      urlNormalized: 'https://example.com/a',
      title: 'Old Title',
      faviconUrl: null,
      position: 'a0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    });

    render(
      <WebGroupImportDialog
        open={true}
        onClose={onClose}
        existingGroups={[existingGroup]}
        repository={repo}
        onImported={onImported}
        mockGroups={[mockGroups[0]!]}
      />
    );

    fireEvent.click(screen.getByTestId('web-group-import-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('web-group-import-done')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('web-group-import-done'));
    expect(onClose).toHaveBeenCalled();

    // Should NOT create duplicate group
    expect(repo.groups).toHaveLength(1);
    // Should add only the missing URL ('https://example.com/b')
    expect(repo.items).toHaveLength(2);
    expect(repo.items[1]!.kind === 'page' && repo.items[1]!.urlNormalized).toBe(
      'https://example.com/b'
    );
  });

  it('displays guidance notice when tab group permissions are not granted and allows retry', async () => {
    vi.mocked(getBrowserTabGroups).mockResolvedValueOnce({
      ok: false,
      error: 'Tab group permissions not granted',
    });

    render(
      <WebGroupImportDialog
        open={true}
        onClose={onClose}
        existingGroups={[]}
        repository={repo}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('web-group-import-permission-notice')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('Extension permission required')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Chrome requires permission before Underscore can access your browser tab groups/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId('web-group-import-retry')).toBeInTheDocument();
    expect(screen.queryByTestId('web-group-import-submit')).not.toBeInTheDocument();
    expect(screen.getByTestId('web-group-import-cancel')).toHaveTextContent('Close');

    // Test retry after granting permissions
    vi.mocked(getBrowserTabGroups).mockResolvedValueOnce({
      ok: true,
      groups: mockGroups,
    });

    fireEvent.click(screen.getByTestId('web-group-import-retry'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('web-group-import-permission-notice')
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText('Research Project')).toBeInTheDocument();
    expect(screen.getByTestId('web-group-import-submit')).toBeInTheDocument();
  });

  it('imports only tabs matching availablePages (tabs with highlights) when availablePages is provided', async () => {
    const availablePages = [
      {
        urlNormalized: 'https://example.com/a',
        title: 'Page A',
        domain: 'example.com',
      },
    ];

    render(
      <WebGroupImportDialog
        open={true}
        onClose={onClose}
        existingGroups={[]}
        repository={repo}
        onImported={onImported}
        mockGroups={[mockGroups[0]!]}
        availablePages={availablePages}
      />
    );

    expect(screen.getByText('1 tab with highlights')).toBeInTheDocument();
    expect(screen.getByTestId('web-group-unhighlighted-badge-1')).toHaveTextContent(
      '(1 without highlights skipped)'
    );

    fireEvent.click(screen.getByTestId('web-group-import-submit'));

    await waitFor(() => {
      expect(repo.groups).toHaveLength(1);
    });

    expect(repo.items).toHaveLength(1);
    expect(repo.items[0]!.kind === 'page' && repo.items[0]!.urlNormalized).toBe(
      'https://example.com/a'
    );
  });
});
