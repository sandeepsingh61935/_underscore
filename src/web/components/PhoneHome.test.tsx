import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PhoneHome } from './PhoneHome';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

const HIGHLIGHTS: WebHighlight[] = [
  {
    id: 'h1',
    domain: 'example.com',
    path: '/docs',
    quote: 'First quote',
    note: '',
    tags: [],
    savedAt: 3000,
  },
  {
    id: 'h2',
    domain: 'example.com',
    path: '/about',
    quote: 'Second quote',
    note: '',
    tags: [],
    savedAt: 2000,
  },
  {
    id: 'h3',
    domain: 'other.org',
    path: '/post',
    quote: 'Third quote',
    note: '',
    tags: [],
    savedAt: 1000,
  },
];

describe('PhoneHome', () => {
  it('shows greeting', () => {
    render(
      <PhoneHome
        greeting="Good evening, sandy"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.getByText('Good evening, sandy')).toBeInTheDocument();
    expect(screen.queryByText('3 highlights')).toBeNull();
  });

  it('shows recent quotes', () => {
    render(
      <PhoneHome
        greeting="Good morning"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.getByText('First quote')).toBeInTheDocument();
    expect(screen.getByText('Second quote')).toBeInTheDocument();
    expect(screen.getByText('Third quote')).toBeInTheDocument();
  });

  it('calls onOpenHighlight when quote is tapped', () => {
    const onOpen = vi.fn();
    render(
      <PhoneHome
        greeting="Good morning"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={onOpen}
      />
    );
    fireEvent.click(screen.getByText('First quote'));
    expect(onOpen).toHaveBeenCalledWith('h1', 'example.com');
  });

  it('does not render Current page, Pages, stats grid, or Ask', () => {
    render(
      <PhoneHome
        greeting="Hello"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.queryByText('Current page')).toBeNull();
    expect(screen.queryByText('Pages')).toBeNull();
    expect(screen.queryByText('Ask')).toBeNull();
    expect(screen.queryByText('This week')).toBeNull();
    expect(screen.queryByText('Sources')).toBeNull();
  });

  it('shows the library strip and current page when the web home has them', () => {
    render(
      <PhoneHome
        greeting="Good evening, sandy"
        count={3}
        recent={HIGHLIGHTS}
        stats={{
          highlightCount: 3,
          thisWeekCount: 1,
          pageCount: 2,
          sourceCount: 2,
          notesCount: 0,
          tagCount: 0,
        }}
        currentPage={{
          domain: 'example.com',
          path: '/docs',
          countLabel: '2 highlights',
          quote: 'First quote',
        }}
        onOpenCurrentPage={() => undefined}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.getByLabelText('Library stats')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('Current page')).toBeInTheDocument();
    expect(screen.queryByText('Ask')).toBeNull();
  });

  it('shows empty message when no highlights', () => {
    render(
      <PhoneHome
        greeting="Hello"
        count={0}
        recent={[]}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.getByText(/no highlights yet/i)).toBeInTheDocument();
  });

  it('paginates recent list items with page size 10', () => {
    const manyHighlights: WebHighlight[] = Array.from({ length: 15 }, (_, i) => ({
      id: `h-${i + 1}`,
      domain: 'example.com',
      path: '/docs',
      quote: `Recent quote ${i + 1}`,
      note: '',
      tags: [],
      savedAt: 1000 + i,
    }));

    render(
      <PhoneHome
        greeting="Good morning"
        count={15}
        recent={manyHighlights}
        onOpenHighlight={() => undefined}
      />
    );

    // Page 1 should show the first 10 items
    expect(screen.getByText('Recent quote 1')).toBeInTheDocument();
    expect(screen.getByText('Recent quote 10')).toBeInTheDocument();
    expect(screen.queryByText('Recent quote 11')).toBeNull();

    // Pager should be rendered
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(pager).toBeInTheDocument();

    // Click page 2
    fireEvent.click(screen.getByRole('listitem', { name: 'Page 2' }));

    // Page 2 should show remaining 5 items
    expect(screen.getByText('Recent quote 11')).toBeInTheDocument();
    expect(screen.getByText('Recent quote 15')).toBeInTheDocument();
    expect(screen.queryByText('Recent quote 1')).toBeNull();
  });

  it('does not render pager when recent items are 10 or fewer', () => {
    render(
      <PhoneHome
        greeting="Good morning"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={() => undefined}
      />
    );

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });
});
