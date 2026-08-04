import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';

const updateText = vi.fn().mockResolvedValue(true);

vi.mock('@/features/collections/hooks/useUpdateHighlightText', () => ({
  useUpdateHighlightText: () => ({ updateText }),
}));

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: () => ({ updateMetadata: vi.fn().mockResolvedValue(true) }),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  copyHighlightPlainText: vi.fn(),
  isExtensionContext: () => true,
}));

describe('LibraryHighlightTile', () => {
  it('shows Edit and persists quote text via updateText', async () => {
    render(
      <LibraryHighlightTile
        highlight={{
          id: 'hl-1',
          text: 'a\nb',
          domain: 'example.com',
          path: '/docs',
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /As captured/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    const textarea = screen.getByLabelText(/Edit highlight markdown/);
    fireEvent.change(textarea, { target: { value: '**edited**' } });
    fireEvent.click(screen.getByRole('button', { name: /Save highlight text/ }));
    await vi.waitFor(() => {
      expect(updateText).toHaveBeenCalledWith('hl-1', '**edited**');
    });
  });

  it('embeds marginalia when allowed', () => {
    render(
      <LibraryHighlightTile
        highlight={{
          id: 'hl-1',
          text: 'quote',
          domain: 'example.com',
          notes: 'n1',
          tags: ['t1'],
        }}
        allowMarginalia
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    expect(screen.getByTestId('highlight-action-row').textContent).toContain('n1');
    expect(screen.getByTestId('highlight-action-row').textContent).toContain('t1');
    expect(screen.getByTestId('highlight-action-row').textContent).toMatch(/Edit/i);
  });

  it('passes match badge through to the card', () => {
    render(
      <LibraryHighlightTile
        highlight={{
          id: 'hl-1',
          text: 'quote',
          domain: 'example.com',
        }}
        matchBadge="Notes · Tags"
      />,
    );
    expect(screen.getByTestId('highlight-match-badge').textContent).toBe('Notes · Tags');
  });

  it('shows invite marginalia on the action row when empty and allowed', () => {
    render(
      <LibraryHighlightTile
        highlight={{
          id: 'hl-1',
          text: 'quote',
          domain: 'example.com',
        }}
        allowMarginalia
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: '+ Add note or tags' })).toBeTruthy();
    expect(screen.getByTestId('highlight-action-row').textContent).toMatch(/Edit/i);
  });
});
