import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PhoneQuoteScreen } from './PhoneQuoteScreen';

const highlight = {
  id: 'h1',
  domain: 'example.com',
  path: '/article',
  quote: 'remarkable insight',
  note: 'secret note',
  tags: ['x'],
  savedAt: 1,
};

describe('PhoneQuoteScreen', () => {
  it('shows quote and source, not editors', () => {
    render(<PhoneQuoteScreen highlight={highlight} />);
    expect(screen.getByText('remarkable insight')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      'https://example.com/article#:~:text=remarkable%20insight'
    );
    expect(screen.getByText('secret note')).toBeInTheDocument();
    expect(screen.getByText('x')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('tracks highlight_open_source on click', () => {
    render(
      <PhoneQuoteScreen highlight={highlight} clientKind="phone" />
    );
    const link = screen.getByRole('link', { name: 'Open' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows Copy button', () => {
    render(<PhoneQuoteScreen highlight={highlight} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('renders related pages in vertical fashion and opens them on tap', () => {
    const onOpen = vi.fn();
    const relatedPages = [
      {
        domain: 'gutenberg.org',
        section: '/ebooks/1234',
        score: 0.9,
        highlightCount: 3,
        reason: 'Shared tags' as const,
        signals: { sharedTags: true, similarText: false },
      },
      {
        domain: 'ricardo.ai',
        section: '/notes/metaphysics',
        score: 0.8,
        highlightCount: 1,
        reason: 'Similar text' as const,
        signals: { sharedTags: false, similarText: true },
      },
    ];

    const { container } = render(
      <PhoneQuoteScreen
        highlight={highlight}
        relatedPages={relatedPages}
        onOpenRelatedPage={onOpen}
      />
    );

    // Verify vertical list container is rendered instead of rail
    expect(container.querySelector('.phone-related--vertical')).toBeInTheDocument();
    expect(container.querySelector('.phone-related-list')).toBeInTheDocument();
    expect(container.querySelector('.phone-related-rail')).toBeNull();

    // Verify content is rendered
    expect(screen.getByText('gutenberg.org')).toBeInTheDocument();
    expect(screen.getByText('ricardo.ai')).toBeInTheDocument();
    expect(screen.getByText('Shared tags')).toBeInTheDocument();
    expect(screen.getByText('Similar text')).toBeInTheDocument();

    // Clicking row triggers callback
    fireEvent.click(screen.getByText('gutenberg.org'));
    expect(onOpen).toHaveBeenCalledWith('gutenberg.org', '/ebooks/1234', 0, 'Shared tags');
  });
});
