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

  it('confirms before deleting a highlight', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <LibraryHighlightTile
        highlight={{
          id: 'hl-1',
          text: 'quote',
          domain: 'example.com',
        }}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Delete highlight/ }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this highlight?')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Delete highlight/ }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await vi.waitFor(() => {
      expect(onDelete).toHaveBeenCalledOnce();
    });
    await vi.waitFor(() => {
      expect(screen.queryByText('Delete this highlight?')).toBeNull();
    });
  });

  it('keeps delete busy until async onDelete settles and closes only on success', async () => {
    let resolveDelete!: () => void;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );

    render(
      <LibraryHighlightTile
        highlight={{
          id: 'hl-1',
          text: 'quote',
          domain: 'example.com',
        }}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Delete highlight/ }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await vi.waitFor(() => {
      expect(onDelete).toHaveBeenCalledOnce();
      expect(screen.getByTestId('confirm-dialog-confirm')).toBeDisabled();
      expect(screen.getByTestId('confirm-dialog-confirm').textContent).toBe('Working…');
    });
    expect(screen.getByText('Delete this highlight?')).toBeInTheDocument();

    // Second confirm while busy must not re-enter onDelete
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    expect(onDelete).toHaveBeenCalledOnce();

    resolveDelete();
    await vi.waitFor(() => {
      expect(screen.queryByText('Delete this highlight?')).toBeNull();
    });
  });

  it('leaves delete dialog open when onDelete rejects', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Delete failed'));

    render(
      <LibraryHighlightTile
        highlight={{
          id: 'hl-1',
          text: 'quote',
          domain: 'example.com',
        }}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Delete highlight/ }));
    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));

    await vi.waitFor(() => {
      expect(onDelete).toHaveBeenCalledOnce();
    });
    await vi.waitFor(() => {
      expect(screen.getByText('Delete this highlight?')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-dialog-confirm')).not.toBeDisabled();
    });
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
