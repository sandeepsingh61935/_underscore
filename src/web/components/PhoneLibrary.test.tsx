import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SEARCH_FIELDS } from '@/shared/utils/highlight-filter';

import { PhoneLibrary } from './PhoneLibrary';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

const HIGHLIGHTS: WebHighlight[] = [
  {
    id: 'h1',
    domain: 'example.com',
    path: '/docs',
    quote: 'Alpha insight',
    note: '',
    tags: [],
    savedAt: 1000,
  },
  {
    id: 'h2',
    domain: 'example.com',
    path: '/about',
    quote: 'Beta quote',
    note: '',
    tags: [],
    savedAt: 900,
  },
  {
    id: 'h3',
    domain: 'other.org',
    path: '/post',
    quote: 'Gamma remark',
    note: '',
    tags: [],
    savedAt: 800,
  },
];

describe('PhoneLibrary', () => {
  it('shows domain list with counts when no domain selected', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('other.org')).toBeInTheDocument();
    expect(screen.getByText('2 highlights')).toBeInTheDocument();
    expect(screen.getByText('1 highlight')).toBeInTheDocument();
  });

  it('calls onOpenDomain when domain row is clicked', () => {
    const onOpenDomain = vi.fn();
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={onOpenDomain}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    fireEvent.click(screen.getByText('example.com'));
    expect(onOpenDomain).toHaveBeenCalledWith('example.com');
  });

  it('shows pages inside a domain, then quotes for the selected page', () => {
    const onSelectSection = vi.fn();
    const { rerender } = render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onSelectSection={onSelectSection}
        onDeleteDomain={vi.fn().mockResolvedValue(true)}
        clientKind="phone"
      />
    );
    expect(
      screen.getByRole('button', { name: 'Delete domain example.com' })
    ).toBeInTheDocument();
    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.getByText('about')).toBeInTheDocument();
    expect(screen.queryByText('Alpha insight')).toBeNull();
    expect(screen.queryByText('Gamma remark')).toBeNull();
    fireEvent.click(screen.getByText('docs'));
    expect(onSelectSection).toHaveBeenCalledWith('/docs');

    rerender(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        section="/docs"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onSelectSection={onSelectSection}
        clientKind="phone"
      />
    );
    expect(screen.getByText('Alpha insight')).toBeInTheDocument();
    expect(screen.queryByText('Beta quote')).toBeNull();
  });

  it('shows PhoneQuoteScreen when highlightId is set', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        highlightId="h1"
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    // Quote screen shows the full quote text
    expect(screen.getByText('Alpha insight')).toBeInTheDocument();
    // Has the Open link (from PhoneQuoteScreen)
    expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument();
    // No domain list rows
    expect(screen.queryByText('other.org')).toBeNull();
  });

  it('shows empty message when no highlights', () => {
    render(
      <PhoneLibrary
        highlights={[]}
        query=""
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText(/no highlights yet/i)).toBeInTheDocument();
  });

  it('selects highlights on a page and deletes them together', () => {
    const onDeleteHighlights = vi.fn().mockResolvedValue(true);
    const onOpenHighlight = vi.fn();
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        section="/docs"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={onOpenHighlight}
        onDeleteHighlights={onDeleteHighlights}
        clientKind="phone"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete highlights' }));
    fireEvent.click(screen.getByText('Alpha insight'));
    expect(onOpenHighlight).not.toHaveBeenCalled();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete 1 highlight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(onDeleteHighlights).toHaveBeenCalledWith(['h1']);
  });

  it('exports the domain and offers delete, notes, and tags when signed in', () => {
    const onExport = vi.fn();
    const onDeleteDomain = vi.fn().mockResolvedValue(true);
    const onNoteSave = vi.fn().mockResolvedValue(true);
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        section="/docs"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
        canExport
        onExport={onExport}
        onDeleteDomain={onDeleteDomain}
        onNoteSave={onNoteSave}
        onTagsChange={vi.fn().mockResolvedValue(true)}
        onDeleteHighlight={vi.fn().mockResolvedValue(true)}
        relatedPages={[
          {
            domain: 'other.org',
            section: '/post',
            score: 1,
            highlightCount: 1,
            reason: 'Shared tags',
            signals: { sharedTags: true, similarText: false },
          },
        ]}
        relatedLabel="Related to docs"
        onOpenRelatedPage={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Export Markdown' }));
    expect(onExport).toHaveBeenCalledWith('md');
    expect(
      screen.getByRole('button', { name: 'Export spreadsheet' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export JSON' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Add note' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Add tags' }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('button', { name: 'Delete highlight' }).length
    ).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Related pages' })).toBeInTheDocument();
    expect(screen.getByText('other.org')).toBeInTheDocument();
  });

  it('selects several pages and deletes them together', () => {
    const onDeletePages = vi.fn().mockResolvedValue(true);
    const onSelectSection = vi.fn();
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onSelectSection={onSelectSection}
        onDeletePages={onDeletePages}
        clientKind="phone"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete pages' }));
    fireEvent.click(screen.getByText('docs'));
    fireEvent.click(screen.getByText('about'));
    expect(onSelectSection).not.toHaveBeenCalled();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete 2 pages' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(onDeletePages).toHaveBeenCalledWith(['/docs', '/about']);
  });

  it('does not render delete, export, or vault UI', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    expect(screen.queryByText(/export/i)).toBeNull();
    expect(screen.queryByText(/vault/i)).toBeNull();
  });

  it('opens Fields, Status, and Tags from the search filter button', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        filters={{
          fields: [...DEFAULT_SEARCH_FIELDS],
          onFieldsChange: () => undefined,
          refine: [],
          onRefineChange: () => undefined,
          tagFilters: [],
          onTagFiltersChange: () => undefined,
          availableTags: [{ label: 'notes', n: 1 }],
        }}
        hasLibrary
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('group', { name: 'Fields' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'With notes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'With tags' })).toBeInTheDocument();
  });

  it('offers the library sort menu', () => {
    const onSortChange = vi.fn();
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        sort="newest"
        onSortChange={onSortChange}
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Newest' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Quote' }));
    expect(onSortChange).toHaveBeenCalledWith('quote');
  });

  it('filters domains by query text', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query="other"
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText('other.org')).toBeInTheDocument();
    expect(screen.queryByText('example.com')).toBeNull();
  });

  it('does not render "1 highlight" meta text when viewing page quotes', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        section="/docs"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText('Alpha insight')).toBeInTheDocument();
    expect(screen.queryByText('1 highlight')).toBeNull();
  });

  it('positions sort line below phone-related section and before quotes list', () => {
    const onSortChange = vi.fn();
    const { container } = render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        section="/docs"
        highlightId={null}
        sort="newest"
        onSortChange={onSortChange}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
        relatedPages={[
          {
            domain: 'other.org',
            section: '/post',
            score: 1,
            highlightCount: 1,
            reason: 'Shared tags',
            signals: { sharedTags: true, similarText: false },
          },
        ]}
        onOpenRelatedPage={() => undefined}
      />
    );

    const related = container.querySelector('.phone-related');
    const sortLine = container.querySelector('.phone-sort-line');
    const quoteList = container.querySelector('.phone-quote-list');

    expect(related).toBeInTheDocument();
    expect(sortLine).toBeInTheDocument();
    expect(quoteList).toBeInTheDocument();

    // Verify DOM order: related -> sortLine -> quoteList
    expect(
      related!.compareDocumentPosition(sortLine!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      sortLine!.compareDocumentPosition(quoteList!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('paginates the page underscore list item view when items exceed page size', () => {
    const manyHighlights: WebHighlight[] = Array.from({ length: 15 }, (_, i) => ({
      id: `h-${i + 1}`,
      domain: 'example.com',
      path: '/docs',
      quote: `Quote number ${i + 1}`,
      note: '',
      tags: [],
      savedAt: 1000 + i,
    }));

    render(
      <PhoneLibrary
        highlights={manyHighlights}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        section="/docs"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        clientKind="phone"
      />
    );

    // Page 1 should show quotes 15 down to 4 (newest first)
    expect(screen.getByText('Quote number 15')).toBeInTheDocument();
    expect(screen.getByText('Quote number 4')).toBeInTheDocument();
    // Quote 1 (oldest) should not be visible on page 1
    expect(screen.queryByText('Quote number 1')).toBeNull();

    // Pager controls should be rendered
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(pager).toBeInTheDocument();

    // Click page 2 button
    fireEvent.click(screen.getByRole('listitem', { name: 'Page 2' }));

    // Page 2 should now show quote 1
    expect(screen.getByText('Quote number 1')).toBeInTheDocument();
    // Page 1 quotes should now be hidden
    expect(screen.queryByText('Quote number 15')).toBeNull();
  });
});
