/**
 * @file GroupImportDialog.test.tsx
 * @description Unit tests for GroupImportDialog (Extension popup tab group import).
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupImportDialog, type BrowserTabGroupInfo } from './GroupImportDialog';

const mockCreateGroup = vi.fn().mockResolvedValue({
  success: true,
  data: { group: { id: 'g-created-1' } },
});
const mockAddPage = vi.fn().mockResolvedValue({ success: true, data: {} });
const mockRefetch = vi.fn().mockResolvedValue({});

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: () => ({
    groups: [],
    items: [],
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

vi.mock('@/features/groups/hooks/useGroupMutations', () => ({
  useGroupMutations: () => ({
    createGroup: mockCreateGroup,
    addPage: mockAddPage,
  }),
}));

const mockTabGroups: BrowserTabGroupInfo[] = [
  {
    id: 1,
    title: 'Research',
    color: 'blue',
    tabCount: 3,
    validUrls: ['https://example.com/a', 'https://example.com/b'],
    skippedCount: 1,
  },
  {
    id: 2,
    title: 'Work',
    color: 'green',
    tabCount: 2,
    validUrls: ['https://example.com/c', 'https://example.com/d'],
    skippedCount: 0,
  },
];

describe('GroupImportDialog', () => {
  const onClose = vi.fn();
  const onImported = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mock groups with titles, tab counts, and skipped badge', () => {
    render(
      <GroupImportDialog
        open={true}
        onClose={onClose}
        onImported={onImported}
        mockGroups={mockTabGroups}
      />
    );

    expect(screen.getByText('Import from browser')).toBeInTheDocument();
    expect(screen.getByText('Research')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByTestId('group-skipped-badge-1')).toHaveTextContent('(1 non-web skipped)');
    expect(screen.getByTestId('group-import-checkbox-1')).toBeChecked();
    expect(screen.getByTestId('group-import-checkbox-2')).toBeChecked();
  });

  it('imports groups, shows progress and completion screen with Done button', async () => {
    render(
      <GroupImportDialog
        open={true}
        onClose={onClose}
        onImported={onImported}
        mockGroups={mockTabGroups}
      />
    );

    const submitBtn = screen.getByTestId('group-import-submit');
    expect(submitBtn).toBeInTheDocument();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('group-import-completion')).toBeInTheDocument();
    });

    const doneBtn = screen.getByTestId('group-import-done');
    expect(doneBtn).toBeInTheDocument();
    fireEvent.click(doneBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('imports only tabs matching highlightUrls when highlightUrls is provided', async () => {
    const highlightUrls = new Set(['https://example.com/a']);

    render(
      <GroupImportDialog
        open={true}
        onClose={onClose}
        onImported={onImported}
        mockGroups={[mockTabGroups[0]!]}
        highlightUrls={highlightUrls}
      />
    );

    expect(screen.getByText('1 with highlights')).toBeInTheDocument();

    const submitBtn = screen.getByTestId('group-import-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith('Research', 'blue');
    });

    await waitFor(() => {
      expect(screen.getByTestId('group-import-completion')).toBeInTheDocument();
    });

    expect(mockAddPage).toHaveBeenCalledTimes(1);
    expect(mockAddPage).toHaveBeenCalledWith('g-created-1', { url: 'https://example.com/a' });
  });
});
