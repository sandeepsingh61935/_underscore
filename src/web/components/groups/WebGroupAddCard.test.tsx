/**
 * @file WebGroupAddCard.test.tsx
 * @description Add Card Seam tests for WebGroupAddCard (PRD 2026-09-29 §3).
 * Tests:
 * - Collapsible toggle expand/collapse behavior
 * - Combobox auto-suggest against mock library pages and domains
 * - Adding existing suggestion vs fallback custom URL/domain
 * - Verify absence of subdomain checkbox and duplicate item tables
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  WebGroupAddCard,
  type LibraryDomainSuggestion,
  type LibraryPageSuggestion,
} from './WebGroupAddCard';

const mockDomains: LibraryDomainSuggestion[] = [
  { hostname: 'github.com', itemCount: 15 },
  { hostname: 'news.ycombinator.com', itemCount: 4 },
];

const mockPages: LibraryPageSuggestion[] = [
  {
    url: 'https://github.com/features/actions',
    title: 'GitHub Actions Documentation',
    domain: 'github.com',
    highlightCount: 3,
  },
  {
    url: 'https://news.ycombinator.com/item?id=123',
    title: 'Ask HN: Favorite books',
    domain: 'news.ycombinator.com',
    highlightCount: 1,
  },
];

describe('WebGroupAddCard Seam', () => {
  const onAddPage = vi.fn();
  const onAddDomain = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onAddPage.mockResolvedValue({ success: true });
    onAddDomain.mockResolvedValue({ success: true });
  });

  it('collapsible toggle expands and collapses the card body', () => {
    render(
      <WebGroupAddCard
        onAddPage={onAddPage}
        onAddDomain={onAddDomain}
        defaultOpen={false}
      />
    );

    // Starts collapsed
    expect(screen.queryByTestId('web-group-add-body')).not.toBeInTheDocument();

    const toggle = screen.getByTestId('web-group-add-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(toggle);
    expect(screen.getByTestId('web-group-add-body')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(toggle);
    expect(screen.queryByTestId('web-group-add-body')).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('combobox auto-suggests matching library domains and pages', async () => {
    render(
      <WebGroupAddCard
        onAddPage={onAddPage}
        onAddDomain={onAddDomain}
        availableDomains={mockDomains}
        availablePages={mockPages}
        defaultOpen={true}
      />
    );

    const input = screen.getByTestId('web-group-add-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'github' } });

    // Dropdown appears with matching domain and page
    expect(screen.getByTestId('web-group-add-dropdown')).toBeInTheDocument();
    expect(screen.getByText('github.com')).toBeInTheDocument();
    expect(screen.getByText('GitHub Actions Documentation')).toBeInTheDocument();

    // Selecting the domain suggestion calls onAddDomain
    fireEvent.click(screen.getByText('github.com'));

    await waitFor(() => {
      expect(onAddDomain).toHaveBeenCalledWith('github.com');
    });
  });

  it('offers fallback custom URL and domain options when query is not in library', async () => {
    render(
      <WebGroupAddCard
        onAddPage={onAddPage}
        onAddDomain={onAddDomain}
        availableDomains={mockDomains}
        availablePages={mockPages}
        defaultOpen={true}
      />
    );

    const input = screen.getByTestId('web-group-add-input');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'nytimes.com' } });

    expect(screen.getByText('Add domain')).toBeInTheDocument();
    expect(screen.getByText('nytimes.com')).toBeInTheDocument();

    fireEvent.click(screen.getByText('nytimes.com'));

    await waitFor(() => {
      expect(onAddDomain).toHaveBeenCalledWith('nytimes.com');
    });
  });

  it('verifies absence of subdomain checkbox and absence of duplicate item tables', () => {
    render(
      <WebGroupAddCard
        onAddPage={onAddPage}
        onAddDomain={onAddDomain}
        availableDomains={mockDomains}
        availablePages={mockPages}
        defaultOpen={true}
      />
    );

    // No checkbox for subdomains
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/include subdomains/i)).not.toBeInTheDocument();

    // No table listing of existing items inside the card
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('web-group-items-table')).not.toBeInTheDocument();
  });
});
