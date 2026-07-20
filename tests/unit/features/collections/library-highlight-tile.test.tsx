import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { LibraryHighlightTile } from '@/features/collections/components/LibraryHighlightTile';

const updateMetadata = vi.fn().mockResolvedValue(true);

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: () => ({ updateMetadata }),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  copyHighlightPlainText: vi.fn(),
  isExtensionContext: () => true,
}));

describe('LibraryHighlightTile', () => {
  it('persists presentation via updateMetadata', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Bullets/i }));
    await vi.waitFor(() => {
      expect(updateMetadata).toHaveBeenCalledWith(
        'hl-1',
        { presentation: { format: 'bullets' } },
        { silent: true },
      );
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
  });
});
