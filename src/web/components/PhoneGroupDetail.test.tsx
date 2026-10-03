/**
 * @file PhoneGroupDetail.test.tsx
 * @description Unit tests for handheld read-only PhoneGroupDetail component.
 * Verifies:
 * - Stack navigation top back button calls onBack
 * - Page links open in new tab with noopener noreferrer
 * - Tap targets are >= 44px
 * - Domain expanding and page resolution
 * - Empty state when group has no items
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import { PhoneGroupDetail } from './PhoneGroupDetail';

vi.mock('@/ui-system/components/primitives/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    onClick,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onSelect || onClick}>
      {children}
    </button>
  ),
}));

const baseGroup: PageGroup = {
  id: 'g-1',
  name: 'Machine Learning',
  color: 'purple',
  position: 'a0',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: 'chrome',
  boundAt: '2026-09-01T00:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

const domainItem: PageGroupItem = {
  id: 'i-dom',
  groupId: 'g-1',
  kind: 'domain',
  hostname: 'arxiv.org',
  includeSubdomains: true,
  position: 'a0',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

const pageItem: PageGroupItem = {
  id: 'i-page',
  groupId: 'g-1',
  kind: 'page',
  urlNormalized: 'https://example.com/transformer-models',
  title: 'Attention Is All You Need',
  faviconUrl: null,
  position: 'a1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

describe('PhoneGroupDetail', () => {
  it('renders group header and calls onBack when back button is tapped', () => {
    const onBack = vi.fn();
    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[domainItem, pageItem]}
        onBack={onBack}
      />
    );

    expect(screen.getByTestId('phone-group-detail-name')).toHaveTextContent('Machine Learning');
    expect(screen.getByTestId('phone-group-detail-state')).toHaveTextContent('Live in Chrome');
    expect(screen.getByText('2 items')).toBeInTheDocument();

    const backButton = screen.getByTestId('phone-group-detail-back');
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when group has no items', () => {
    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[]}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByTestId('phone-group-detail-empty')).toBeInTheDocument();
    expect(screen.getByText(/No pages in this group yet/i)).toBeInTheDocument();
  });

  it('renders standalone pages with noopener noreferrer anchors', () => {
    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[pageItem]}
        highlightCountForUrl={() => 3}
        onBack={vi.fn()}
      />
    );

    const anchor = screen.getByTestId('phone-group-page-i-page');
    expect(anchor).toBeInTheDocument();
    expect(anchor.tagName.toLowerCase()).toBe('a');
    expect(anchor).toHaveAttribute('href', 'https://example.com/transformer-models');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor).toHaveTextContent('Attention Is All You Need');
    expect(anchor).toHaveTextContent('3');
  });

  it('expands domain rules to show matched pages', () => {
    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[domainItem]}
        knownPages={[
          {
            urlNormalized: 'https://arxiv.org/abs/1706.03762',
            title: 'Attention Paper',
            faviconUrl: null,
          },
        ]}
        highlightCountForUrl={() => 5}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('arxiv.org')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-group-domain-pages-i-dom')).not.toBeInTheDocument();

    const toggle = screen.getByTestId('phone-group-domain-toggle-i-dom');
    fireEvent.click(toggle);

    expect(screen.getByTestId('phone-group-domain-pages-i-dom')).toBeInTheDocument();
    const pageAnchor = screen.getByTestId('phone-group-page-via-i-dom');
    expect(pageAnchor).toBeInTheDocument();
    expect(pageAnchor).toHaveAttribute('href', 'https://arxiv.org/abs/1706.03762');
    expect(pageAnchor).toHaveAttribute('target', '_blank');
    expect(pageAnchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(pageAnchor).toHaveTextContent('Attention Paper');
    expect(pageAnchor).toHaveTextContent('5');
  });

  it('verifies all interactive elements have minimum 44px tap targets', () => {
    const { container } = render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[domainItem, pageItem]}
        highlightCountForUrl={() => 1}
        onBack={vi.fn()}
      />
    );

    const interactive = container.querySelectorAll('button, a');
    expect(interactive.length).toBeGreaterThan(0);
    interactive.forEach((el) => {
      const style = (el as HTMLElement).style;
      const minHeight = style.minHeight;
      expect(minHeight).toBe('44px');
    });
  });

  it('omits pages that do not have highlights', () => {
    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[pageItem]}
        highlightCountForUrl={() => 0}
        onBack={vi.fn()}
      />
    );
    expect(screen.queryByTestId('phone-group-page-i-page')).not.toBeInTheDocument();
  });

  it('renders highlights section when highlights are passed and handles onOpenHighlight', () => {
    const onOpenHighlight = vi.fn();
    const sampleHl: WebHighlight = {
      id: 'hl-test-1',
      domain: 'arxiv.org',
      path: '/abs/1706.03762',
      quote: 'Attention is all you need for sequence transduction.',
      note: 'Foundational paper',
      tags: ['nlp', 'transformers'],
      savedAt: 1725148800000,
    };

    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[domainItem]}
        highlights={[sampleHl]}
        onOpenHighlight={onOpenHighlight}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByTestId('phone-group-highlights')).toBeInTheDocument();
    expect(screen.getByTestId('phone-group-highlights-header')).toHaveTextContent('Highlights · 1');
    expect(screen.getByText('Attention is all you need for sequence transduction.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Attention is all you need for sequence transduction.'));
    expect(onOpenHighlight).toHaveBeenCalledWith('hl-test-1');
  });

  it('filters domain accordion pages to only those with highlights > 0', () => {
    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[domainItem]}
        knownPages={[
          {
            urlNormalized: 'https://arxiv.org/abs/1706.03762',
            title: 'Attention Paper',
            faviconUrl: null,
          },
          {
            urlNormalized: 'https://arxiv.org/abs/zero-highlights',
            title: 'Zero Highlights Paper',
            faviconUrl: null,
          },
        ]}
        highlightCountForUrl={(url) => (url.includes('zero') ? 0 : 3)}
        onBack={vi.fn()}
      />
    );

    const toggle = screen.getByTestId('phone-group-domain-toggle-i-dom');
    fireEvent.click(toggle);

    expect(screen.getByText('Attention Paper')).toBeInTheDocument();
    expect(screen.queryByText('Zero Highlights Paper')).not.toBeInTheDocument();
  });

  it('renders header menu and triggers rename, recolor, and delete dialogs', () => {
    const onRenameGroup = vi.fn().mockResolvedValue(null);
    const onRecolorGroup = vi.fn().mockResolvedValue(null);
    const onDeleteGroup = vi.fn().mockResolvedValue(null);

    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[domainItem]}
        onRenameGroup={onRenameGroup}
        onRecolorGroup={onRecolorGroup}
        onDeleteGroup={onDeleteGroup}
        onBack={vi.fn()}
      />
    );

    const menuBtn = screen.getByTestId('phone-group-detail-menu-button');
    expect(menuBtn).toBeInTheDocument();
    fireEvent.click(menuBtn);

    expect(screen.getByText('Rename group')).toBeInTheDocument();
    expect(screen.getByText('Change color')).toBeInTheDocument();
    expect(screen.getByText('Delete group')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Rename group'));
    expect(screen.getByTestId('new-group-name')).toBeInTheDocument();
  });

  it('renders page menu with remove item and select multiple pages', async () => {
    const onRemoveItem = vi.fn().mockResolvedValue({ success: true });

    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[pageItem]}
        highlightCountForUrl={() => 2}
        onRemoveItem={onRemoveItem}
        onBack={vi.fn()}
      />
    );

    const menuBtn = screen.getByTestId('phone-group-page-menu-i-page');
    expect(menuBtn).toBeInTheDocument();
    fireEvent.click(menuBtn);

    expect(screen.getByText('Remove from group')).toBeInTheDocument();
    expect(screen.getByText('Select multiple pages…')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Remove from group'));
    expect(onRemoveItem).toHaveBeenCalledWith('g-1', 'i-page');
  });

  it('supports multi-select batch delete', async () => {
    const onRemoveItem = vi.fn().mockResolvedValue({ success: true });

    render(
      <PhoneGroupDetail
        group={baseGroup}
        items={[pageItem]}
        highlightCountForUrl={() => 2}
        onRemoveItem={onRemoveItem}
        onBack={vi.fn()}
      />
    );

    const selectToggle = screen.getByTestId('phone-group-detail-select-toggle');
    expect(selectToggle).toHaveTextContent('Select');
    fireEvent.click(selectToggle);

    expect(screen.getByTestId('phone-group-detail-batch-bar')).toBeInTheDocument();
    const deleteBtn = screen.getByTestId('phone-group-detail-batch-delete-btn');
    expect(deleteBtn).toBeDisabled();

    // Select checkbox
    const checkbox = screen.getByTestId(`phone-page-checkbox-${encodeURIComponent('https://example.com/transformer-models')}`);
    fireEvent.click(checkbox);

    expect(deleteBtn).not.toBeDisabled();
    expect(deleteBtn).toHaveTextContent('Delete (1)');

    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(onRemoveItem).toHaveBeenCalledWith('g-1', 'i-page');
    });
  });
});


