/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DeleteGroupDialog } from '@/features/groups/components/DeleteGroupDialog';
import { GroupEmptyState } from '@/features/groups/components/GroupEmptyState';
import { GroupStateLine } from '@/features/groups/components/GroupStateLine';
import type { PageGroup } from '@/shared/types/page-group';

describe('DeleteGroupDialog - Live tabs behavior', () => {
  it('renders standard copy when group is not live on this device', () => {
    render(
      <DeleteGroupDialog
        open={true}
        groupName="Saved Research"
        itemCount={3}
        isLiveOnThisDevice={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Delete "Saved Research"?')).toBeInTheDocument();
    expect(
      screen.getByText('This removes the group and its 3 items. Your highlights stay in the Library.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('delete-group-close-tabs')).not.toBeInTheDocument();
  });

  it('renders "tabs stay open and are ungrouped" and "Also close the tabs" checkbox when live on this device', () => {
    const onConfirmMock = vi.fn();

    render(
      <DeleteGroupDialog
        open={true}
        groupName="Active Project"
        itemCount={4}
        isLiveOnThisDevice={true}
        onClose={vi.fn()}
        onConfirm={onConfirmMock}
      />
    );

    expect(screen.getByText('Its 4 tabs stay open and are ungrouped.')).toBeInTheDocument();
    const checkbox = screen.getByTestId('delete-group-close-tabs');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    // Confirm without checking
    fireEvent.click(screen.getByTestId('delete-group-confirm'));
    expect(onConfirmMock).toHaveBeenCalledWith(false);
  });

  it('passes closeTabs: true when user checks the checkbox', () => {
    const onConfirmMock = vi.fn();

    render(
      <DeleteGroupDialog
        open={true}
        groupName="Active Project"
        itemCount={4}
        isLiveOnThisDevice={true}
        onClose={vi.fn()}
        onConfirm={onConfirmMock}
      />
    );

    const checkbox = screen.getByTestId('delete-group-close-tabs');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByTestId('delete-group-confirm'));
    expect(onConfirmMock).toHaveBeenCalledWith(true);
  });
});

describe('GroupStateLine', () => {
  const baseGroup: PageGroup = {
    id: 'grp-test',
    name: 'Test Group',
    color: 'blue',
    position: 'a0',
    boundDeviceId: null,
    boundDeviceLabel: null,
    boundBrowser: null,
    boundAt: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    deletedAt: null,
  };

  it('renders "Live in Chrome on this device · N tabs" when bound locally', () => {
    const group: PageGroup = {
      ...baseGroup,
      boundDeviceId: 'dev-1',
      boundDeviceLabel: 'this device',
      boundBrowser: 'chrome',
    };

    render(
      <GroupStateLine
        group={group}
        currentDeviceId="dev-1"
        tabCount={5}
      />
    );

    expect(screen.getByText('Live in Chrome on this device · 5 tabs')).toBeInTheDocument();
  });

  it('renders "Live on {label}" when bound elsewhere', () => {
    const group: PageGroup = {
      ...baseGroup,
      boundDeviceId: 'dev-other',
      boundDeviceLabel: 'MacBook Pro',
      boundBrowser: 'firefox',
    };

    render(
      <GroupStateLine
        group={group}
        currentDeviceId="dev-1"
      />
    );

    expect(screen.getByText('Live on MacBook Pro')).toBeInTheDocument();
  });

  it('renders "Closed · last open {relative}" when closed with boundAt timestamp', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const group: PageGroup = {
      ...baseGroup,
      boundDeviceId: null,
      boundAt: tenMinAgo,
    };

    render(
      <GroupStateLine
        group={group}
        currentDeviceId="dev-1"
      />
    );

    expect(screen.getByText('Closed · last open 10m ago')).toBeInTheDocument();
  });
});

describe('GroupEmptyState - Nudge Card', () => {
  it('renders sync nudge card when browser sync is supported but not enabled', () => {
    render(
      <GroupEmptyState
        isAuthenticated={true}
        onNewGroup={vi.fn()}
        isSyncSupported={true}
        isSyncEnabled={false}
      />
    );

    expect(screen.getByTestId('groups-sync-nudge')).toBeInTheDocument();
    expect(screen.getByText('Sync with your browser tab groups')).toBeInTheDocument();
    expect(screen.getByTestId('groups-sync-nudge-enable')).toBeInTheDocument();
    expect(screen.getByTestId('groups-sync-nudge-settings')).toBeInTheDocument();
  });

  it('hides nudge card when dismissed', () => {
    render(
      <GroupEmptyState
        isAuthenticated={true}
        onNewGroup={vi.fn()}
        isSyncSupported={true}
        isSyncEnabled={false}
      />
    );

    fireEvent.click(screen.getByTestId('groups-sync-nudge-dismiss'));
    expect(screen.queryByTestId('groups-sync-nudge')).not.toBeInTheDocument();
  });
});
