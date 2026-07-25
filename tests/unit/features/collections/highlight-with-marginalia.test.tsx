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
  it('puts invite and Edit/Copy/Delete on one action row', () => {
    render(
      <HighlightWithMarginalia
        highlightId="hl-1"
        quote="A short quote."
        domain="example.com"
        isExpanded={false}
        onToggleExpand={vi.fn()}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const row = screen.getByTestId('highlight-action-row');
    expect(row.textContent).toContain('+ Add note or tags');
    expect(row.textContent).toMatch(/Edit/i);
    expect(row.textContent).toMatch(/Copy/i);
    expect(row.textContent).toMatch(/Delete/i);
    expect(screen.queryByTestId('highlight-format-toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: /As captured/i })).toBeNull();
  });

  it('puts collapsed note + tags on the action row with Edit', () => {
    render(
      <HighlightWithMarginalia
        highlightId="hl-1"
        quote="A short quote."
        domain="example.com"
        notes="My note"
        labels={['bfs']}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />,
    );

    const row = screen.getByTestId('highlight-action-row');
    expect(row.textContent).toContain('My note');
    expect(row.textContent).toContain('bfs');
    expect(row.textContent).toMatch(/Edit/i);
  });
});
