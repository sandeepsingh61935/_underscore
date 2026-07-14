/**
 * Unified tile: notes/tags embed on the same action row as Edit/Copy/Delete.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HighlightWithMarginalia } from '@/features/collections/components/HighlightWithMarginalia';

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: () => ({
    updateMetadata: vi.fn().mockResolvedValue(true),
  }),
}));

describe('HighlightWithMarginalia', () => {
  it('puts invite and Edit on one action row', () => {
    render(
      <HighlightWithMarginalia
        highlightId="hl-1"
        quote="A short quote."
        domain="example.com"
        isExpanded={false}
        onToggleExpand={vi.fn()}
        onSaveQuote={async () => true}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const row = screen.getByTestId('highlight-action-row');
    expect(row.textContent).toContain('+ Add note or tags');
    expect(row.textContent).toMatch(/Edit/i);
    expect(row.textContent).toMatch(/Copy/i);
    expect(row.textContent).toMatch(/Delete/i);
  });

  it('puts collapsed note + tags on the action row without a second Edit label', () => {
    render(
      <HighlightWithMarginalia
        highlightId="hl-1"
        quote="A short quote."
        domain="example.com"
        notes="My note"
        labels={['bfs']}
        isExpanded={false}
        onToggleExpand={vi.fn()}
        onSaveQuote={async () => true}
      />,
    );

    const row = screen.getByTestId('highlight-action-row');
    expect(row.textContent).toContain('My note');
    expect(row.textContent).toContain('bfs');
    // Quote Edit is present; marginalia secondary "Edit" is hidden when embedded.
    expect(screen.getAllByRole('button', { name: /Edit highlight text/ })).toHaveLength(1);
  });
});
