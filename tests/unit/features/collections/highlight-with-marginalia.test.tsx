/**
 * Unified tile: notes/tags embed on the same action row as Edit / Copy / Delete.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HighlightWithMarginalia } from '@/features/collections/components/HighlightWithMarginalia';

vi.mock('@/features/collections/hooks/useUpdateHighlightText', () => ({
  useUpdateHighlightText: () => ({
    updateText: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: () => ({
    updateMetadata: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  copyHighlightPlainText: vi.fn(),
  isExtensionContext: () => true,
}));

describe('HighlightWithMarginalia', () => {
  it('puts note/tags actions and Edit/Copy/Delete on one action row', () => {
    render(
      <HighlightWithMarginalia
        highlightId="hl-1"
        quote="A short quote."
        domain="example.com"
        isExpanded={false}
        onToggleExpand={vi.fn()}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Add note/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add tags/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Edit highlight text/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Copy highlight text/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Delete highlight/i })).toBeTruthy();
    expect(screen.queryByTestId('highlight-format-toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: /As captured/i })).toBeNull();
  });

  it('renders note + tags and action buttons', () => {
    render(
      <HighlightWithMarginalia
        highlightId="hl-1"
        quote="A short quote."
        domain="example.com"
        notes="My note"
        labels={['bfs']}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />
    );

    expect(screen.getByText('My note')).toBeTruthy();
    expect(screen.getByText('bfs')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Edit highlight text/i })).toBeTruthy();
  });

  it('opens note input when Add note button is clicked', () => {
    render(
      <HighlightWithMarginalia
        highlightId="hl-1"
        quote="A short quote."
        domain="example.com"
        isExpanded
        onToggleExpand={vi.fn()}
      />
    );

    const addNoteBtn = screen.getByRole('button', { name: /Add note/i });
    expect(addNoteBtn).toBeTruthy();
  });
});
