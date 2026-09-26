import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HighlightQuoteView } from './HighlightQuoteView';
import type { OpenedHighlight } from '../opened-highlight';

const openExternalUrlMock = vi.fn();

vi.mock('@/shared/utils/open-external-url', () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrlMock(...args),
}));

vi.mock('@/shared/hooks/useIpcAction', () => ({
  useIpcAction: () => vi.fn().mockResolvedValue({ success: true, data: { docs: [] } }),
}));

vi.mock('@/features/collections/hooks/useLibraryRelatedness', () => ({
  useLibraryRelatednessService: () => ({
    relatedPages: (_domain: string, _path: string) => [
      {
        domain: 'gutenberg.org',
        section: '/ebooks/1234',
        highlightCount: 3,
        reason: 'Shared tags',
      },
      {
        domain: 'ricardo.ai',
        section: '/notes/metaphysics',
        highlightCount: 1,
        reason: 'Similar text',
      },
    ],
  }),
}));

vi.mock('@/features/collections/components/DomainFavicon', () => ({
  DomainFavicon: ({ domain }: { domain: string }) => (
    <span data-testid={`favicon-${domain}`}>{domain[0]}</span>
  ),
}));

describe('HighlightQuoteView', () => {
  const baseHighlight: OpenedHighlight = {
    id: 'hl-1',
    text: 'A profound philosophical quote.',
    domain: 'example.com',
    path: '/articles/epistemology',
    notes: 'Important passage on epistemology',
    tags: ['ancient-greece', 'ethics'],
    url: 'https://example.com/articles/epistemology',
  };

  it('renders quote text, domain, and section path', () => {
    render(<HighlightQuoteView highlight={baseHighlight} />);

    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('A profound philosophical quote.')).toBeInTheDocument();
    expect(screen.getByText('epistemology')).toBeInTheDocument();
  });

  it('renders "Note" card with kicker and note body', () => {
    render(<HighlightQuoteView highlight={baseHighlight} />);

    const noteCard = screen.getByTestId('quote-detail-note');
    expect(noteCard).toBeInTheDocument();
    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.getByText('Important passage on epistemology')).toBeInTheDocument();
  });

  it('renders tags pills', () => {
    render(<HighlightQuoteView highlight={baseHighlight} />);

    expect(screen.getByText('ancient-greece')).toBeInTheDocument();
    expect(screen.getByText('ethics')).toBeInTheDocument();
  });

  it('renders vertical related pages card stack with favicon, reason, and count', () => {
    const onOpenSection = vi.fn();
    const { container } = render(
      <HighlightQuoteView highlight={baseHighlight} onOpenSection={onOpenSection} />
    );

    // Container with vertical styling
    expect(container.querySelector('.quote-detail-related--vertical')).toBeInTheDocument();
    expect(container.querySelector('.quote-detail-list')).toBeInTheDocument();
    expect(container.querySelector('.quote-detail-rail')).toBeNull();

    // Kicker shows section path
    expect(screen.getByText('Related to epistemology')).toBeInTheDocument();

    // Rows render domain without reason badge
    expect(screen.getByText('gutenberg.org')).toBeInTheDocument();
    expect(screen.getByText('ricardo.ai')).toBeInTheDocument();
    expect(screen.queryByText('Shared tags')).toBeNull();
    expect(screen.queryByText('Similar text')).toBeNull();

    // Clicking row triggers onOpenSection
    fireEvent.click(screen.getByText('gutenberg.org'));
    expect(onOpenSection).toHaveBeenCalledWith('gutenberg.org', '/ebooks/1234');
  });

  it('renders Open button with primary variant and triggers external link open', () => {
    render(<HighlightQuoteView highlight={baseHighlight} />);

    const openBtn = screen.getByRole('button', { name: 'Open' });
    expect(openBtn).toBeInTheDocument();
    // In ui-system/Button, primary variant applies .primary class
    expect(openBtn.className).toContain('primary');

    fireEvent.click(openBtn);
    expect(openExternalUrlMock).toHaveBeenCalledWith(
      'https://example.com/articles/epistemology#:~:text=A%20profound%20philosophical%20quote.'
    );
  });

  it('renders Copy button and copies text to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<HighlightQuoteView highlight={baseHighlight} />);

    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);
    expect(writeTextMock).toHaveBeenCalledWith(
      'https://example.com/articles/epistemology#:~:text=A%20profound%20philosophical%20quote.'
    );

    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });
});
