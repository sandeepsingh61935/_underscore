/**
 * @file web-group-open-in-browser.test.tsx
 * @description Unit tests for WebGroupPane "Open in browser" integration (Task 3.5).
 * Tests installed vs missing extension states, postMessage bridge invocation,
 * large group confirmation dialog (> 15 tabs), and force retry.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { ExtensionPresenceProvider } from '@/web/extension-presence-context';

const { openGroupInBrowserMock, getBrowserTabGroupsMock, focusTabGroupMock, toastMock } = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  });
  return {
    openGroupInBrowserMock: vi.fn(),
    getBrowserTabGroupsMock: vi.fn(),
    focusTabGroupMock: vi.fn(),
    toastMock: toastFn,
  };
});

vi.mock('@/web/lib/extension-bridge', () => ({
  openGroupInBrowser: (...args: unknown[]) => openGroupInBrowserMock(...args),
  getBrowserTabGroups: (...args: unknown[]) => getBrowserTabGroupsMock(...args),
  focusTabGroup: (...args: unknown[]) => focusTabGroupMock(...args),
}));

vi.mock('sonner', () => ({
  toast: toastMock,
}));

import { WebGroupPane } from '@/web/components/groups/WebGroupPane';

const baseGroup: PageGroup = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Research Group',
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

const pageItem: PageGroupItem = {
  id: 'item-1',
  groupId: baseGroup.id,
  kind: 'page',
  urlNormalized: 'https://example.com/article',
  title: 'Example Article',
  faviconUrl: null,
  position: 'a0',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

function renderPane(
  presenceOverride: 'installed' | 'missing' | 'unknown' = 'installed',
  groupOverride: Partial<PageGroup> = {}
) {
  const group = { ...baseGroup, ...groupOverride };
  return render(
    <MemoryRouter>
      <ExtensionPresenceProvider presenceOverride={presenceOverride}>
        <WebGroupPane
          group={group}
          items={[pageItem]}
          highlightCountForUrl={() => 0}
          onRename={vi.fn().mockResolvedValue({ success: true })}
          onRecolor={vi.fn().mockResolvedValue({ success: true })}
          onDelete={vi.fn().mockResolvedValue({ success: true })}
          onAddPage={vi.fn().mockResolvedValue({ success: true })}
          onAddDomain={vi.fn().mockResolvedValue({ success: true })}
          onRemoveItem={vi.fn().mockResolvedValue({ success: true })}
          onMoveItem={vi.fn().mockResolvedValue({ success: true })}
          onDeleted={vi.fn()}
        />
      </ExtensionPresenceProvider>
    </MemoryRouter>
  );
}

describe('WebGroupPane - Open in browser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getBrowserTabGroupsMock.mockResolvedValue({ ok: true, groups: [] });
    focusTabGroupMock.mockResolvedValue({ ok: true });
  });

  it('renders "Open in browser" button when extension is installed', () => {
    renderPane('installed');

    expect(screen.getByTestId('web-group-open-in-browser-button')).toBeInTheDocument();
    expect(screen.getByText('Open in browser')).toBeInTheDocument();
    expect(screen.queryByTestId('web-group-install-link')).not.toBeInTheDocument();
  });

  it('does NOT render "Open in browser" or install link when extension is missing', () => {
    renderPane('missing');

    expect(screen.queryByTestId('web-group-open-in-browser-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('web-group-install-link')).not.toBeInTheDocument();
    expect(screen.queryByText(/install extension/i)).not.toBeInTheDocument();
  });

  it('does NOT render install link when presence is unknown', () => {
    renderPane('unknown');

    expect(screen.queryByTestId('web-group-open-in-browser-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('web-group-install-link')).not.toBeInTheDocument();
  });

  it('clicking "Open in browser" invokes openGroupInBrowser and toasts on success', async () => {
    openGroupInBrowserMock.mockResolvedValueOnce({
      ok: true,
      browserGroupId: 10,
      tabCount: 1,
    });

    renderPane('installed');

    fireEvent.click(screen.getByTestId('web-group-open-in-browser-button'));

    await waitFor(() => {
      expect(openGroupInBrowserMock).toHaveBeenCalledWith(baseGroup.id, false);
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Opened in browser');
    });
  });

  it('shows error toast when openGroupInBrowser returns error', async () => {
    openGroupInBrowserMock.mockResolvedValueOnce({
      ok: false,
      error: 'Extension bridge timed out',
    });

    renderPane('installed');

    fireEvent.click(screen.getByTestId('web-group-open-in-browser-button'));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Extension bridge timed out');
    });
  });

  it('shows confirmation dialog when > 15 tabs and forces retry on confirm', async () => {
    openGroupInBrowserMock
      .mockResolvedValueOnce({
        ok: false,
        needsConfirm: true,
        tabCount: 22,
      })
      .mockResolvedValueOnce({
        ok: true,
        browserGroupId: 12,
        tabCount: 22,
      });

    renderPane('installed');

    fireEvent.click(screen.getByTestId('web-group-open-in-browser-button'));

    await waitFor(() => {
      expect(screen.getByTestId('open-in-browser-dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('Open 22 tabs?')).toBeInTheDocument();
    expect(
      screen.getByText('Opening 22 tabs might slow down your browser. Open anyway?')
    ).toBeInTheDocument();

    // Confirm the dialog
    fireEvent.click(screen.getByTestId('open-in-browser-confirm'));

    await waitFor(() => {
      expect(openGroupInBrowserMock).toHaveBeenCalledWith(baseGroup.id, true);
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Opened in browser');
    });
  });

  it('cancelling confirmation dialog closes dialog without calling force', async () => {
    openGroupInBrowserMock.mockResolvedValueOnce({
      ok: false,
      needsConfirm: true,
      tabCount: 18,
    });

    renderPane('installed');

    fireEvent.click(screen.getByTestId('web-group-open-in-browser-button'));

    await waitFor(() => {
      expect(screen.getByTestId('open-in-browser-dialog')).toBeInTheDocument();
    });

    openGroupInBrowserMock.mockClear();

    fireEvent.click(screen.getByTestId('open-in-browser-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('open-in-browser-dialog')).not.toBeInTheDocument();
    });

    expect(openGroupInBrowserMock).not.toHaveBeenCalled();
  });

  it('renders "Focus in browser" button and live pill when group is live', () => {
    renderPane('installed', { boundBrowser: 'chrome' });

    expect(screen.getByTestId('group-live-pill')).toBeInTheDocument();
    expect(screen.getByText(/Live in Chrome/i)).toBeInTheDocument();
    expect(screen.getByTestId('web-group-focus-in-browser-button')).toBeInTheDocument();
    expect(screen.getByText('Focus in browser')).toBeInTheDocument();
    expect(screen.queryByTestId('web-group-open-in-browser-button')).not.toBeInTheDocument();
  });

  it('clicking "Focus in browser" invokes focusTabGroup when browser group is matched', async () => {
    getBrowserTabGroupsMock.mockResolvedValueOnce({
      ok: true,
      groups: [
        {
          id: 42,
          title: baseGroup.name,
          color: baseGroup.color,
          tabCount: 1,
          validUrls: ['https://example.com/article'],
          skippedCount: 0,
        },
      ],
    });

    renderPane('installed');

    await waitFor(() => {
      expect(screen.getByTestId('web-group-focus-in-browser-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('web-group-focus-in-browser-button'));

    await waitFor(() => {
      expect(focusTabGroupMock).toHaveBeenCalledWith(42);
    });
  });

  it('menu renders export actions (Copy URLs, Markdown, HTML Bookmarks)', async () => {
    renderPane('installed');

    fireEvent.pointerDown(screen.getByTestId('web-group-pane-menu'));

    await waitFor(() => {
      expect(screen.getByTestId('web-group-menu-copy-urls')).toBeInTheDocument();
      expect(screen.getByTestId('web-group-menu-export-md')).toBeInTheDocument();
      expect(screen.getByTestId('web-group-menu-export-html')).toBeInTheDocument();
    });
  });
});
