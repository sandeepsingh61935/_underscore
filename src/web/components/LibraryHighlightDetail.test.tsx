import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LibraryHighlightDetail } from './LibraryHighlightDetail';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

describe('LibraryHighlightDetail', () => {
  const baseHighlight: WebHighlight = {
    id: 'hl-1',
    quote: 'Knowledge is justified true belief.',
    domain: 'example.com',
    path: '/epistemology/intro',
    note: 'Plato Theaetetus inquiry',
    tags: ['philosophy', 'epistemology'],
    savedAt: 1700000000000,
    encrypted: false,
  };

  it('renders quote, domain, and "Note" block with kicker and body', () => {
    const onBack = vi.fn();
    render(
      <LibraryHighlightDetail
        highlight={baseHighlight}
        onBack={onBack}
      />
    );

    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('“Knowledge is justified true belief.”')).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.getByText('Plato Theaetetus inquiry')).toBeInTheDocument();
  });

  it('triggers onBack when Back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <LibraryHighlightDetail
        highlight={baseHighlight}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders vertical related pages card stack and handles row click', () => {
    const onOpenRelatedPage = vi.fn();
    const relatedPages = [
      {
        domain: 'gutenberg.org',
        section: '/ebooks/1234',
        highlightCount: 3,
        reason: 'Shared tags' as const,
        score: 0.9,
        signals: { sharedTags: true, similarText: false },
      },
      {
        domain: 'ricardo.ai',
        section: '/notes/metaphysics',
        highlightCount: 1,
        reason: 'Similar text' as const,
        score: 0.7,
        signals: { sharedTags: false, similarText: true },
      },
    ];

    const { container } = render(
      <LibraryHighlightDetail
        highlight={baseHighlight}
        relatedPages={relatedPages}
        relatedLabel="Related to epistemology/intro"
        onOpenRelatedPage={onOpenRelatedPage}
        onBack={vi.fn()}
      />
    );

    // Verify vertical list layout is rendered
    expect(container.querySelector('.phone-related--vertical')).toBeInTheDocument();
    expect(container.querySelector('.phone-related-list')).toBeInTheDocument();

    // Verify label and row content without reason badges
    expect(screen.getByText('Related to epistemology/intro')).toBeInTheDocument();
    expect(screen.getByText('gutenberg.org')).toBeInTheDocument();
    expect(screen.getByText('ricardo.ai')).toBeInTheDocument();
    expect(screen.queryByText('Shared tags')).toBeNull();
    expect(screen.queryByText('Similar text')).toBeNull();

    // Clicking row triggers callback
    fireEvent.click(screen.getByText('gutenberg.org'));
    expect(onOpenRelatedPage).toHaveBeenCalledWith('gutenberg.org', '/ebooks/1234', 0, 'Shared tags');
  });
});
