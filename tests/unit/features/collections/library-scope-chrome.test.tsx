import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { LibraryScopeChrome } from '@/features/collections/components/LibraryScopeChrome';

vi.mock('@/features/collections/components/ExportActions', () => ({
  ExportActions: () => <div data-testid="export-actions-mock">Export</div>,
}));

describe('LibraryScopeChrome', () => {
  it('renders title and count', () => {
    render(
      <LibraryScopeChrome
        title="example.com/docs"
        highlightCount={3}
        exportScope={{ kind: 'section', domain: 'example.com', sectionKey: '/docs' }}
        deleteAriaLabel="Delete section"
        sort="newest"
        onSortChange={vi.fn()}
        searchSlot={<div>search</div>}
      />
    );

    expect(screen.getByText('example.com/docs')).toBeInTheDocument();
    expect(screen.getByText(/3 highlights/i)).toBeInTheDocument();
  });

  it('renders onOpenPage button in scope toolbar and calls callback on click', () => {
    const onOpenPage = vi.fn();

    render(
      <LibraryScopeChrome
        title="example.com/docs"
        highlightCount={2}
        exportScope={{ kind: 'section', domain: 'example.com', sectionKey: '/docs' }}
        onOpenPage={onOpenPage}
        deleteAriaLabel="Delete section"
        sort="newest"
        onSortChange={vi.fn()}
        searchSlot={<div>search</div>}
      />
    );

    const openBtn = screen.getByRole('button', { name: /Open page in new browser tab/i });
    expect(openBtn).toBeInTheDocument();
    fireEvent.click(openBtn);
    expect(onOpenPage).toHaveBeenCalledOnce();
  });

  it('renders onDelete button only when showDelete is true', () => {
    const onDelete = vi.fn();

    const { rerender } = render(
      <LibraryScopeChrome
        title="example.com/docs"
        highlightCount={2}
        exportScope={{ kind: 'section', domain: 'example.com', sectionKey: '/docs' }}
        onDelete={onDelete}
        deleteAriaLabel="Delete section"
        sort="newest"
        onSortChange={vi.fn()}
        searchSlot={<div>search</div>}
      />
    );

    expect(screen.queryByRole('button', { name: /Delete section/i })).toBeNull();

    rerender(
      <LibraryScopeChrome
        title="example.com/docs"
        highlightCount={2}
        exportScope={{ kind: 'section', domain: 'example.com', sectionKey: '/docs' }}
        onDelete={onDelete}
        deleteAriaLabel="Delete section"
        showDelete={true}
        sort="newest"
        onSortChange={vi.fn()}
        searchSlot={<div>search</div>}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /Delete section/i });
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('omits onOpenPage button when handler is not provided', () => {
    render(
      <LibraryScopeChrome
        title="example.com/docs"
        highlightCount={2}
        exportScope={{ kind: 'section', domain: 'example.com', sectionKey: '/docs' }}
        deleteAriaLabel="Delete section"
        sort="newest"
        onSortChange={vi.fn()}
        searchSlot={<div>search</div>}
      />
    );

    expect(
      screen.queryByRole('button', { name: /Open page in new browser tab/i })
    ).toBeNull();
  });

  it('renders function searchSlot receiving the toolbar element', () => {
    render(
      <LibraryScopeChrome
        title="example.com/docs"
        highlightCount={2}
        exportScope={{ kind: 'section', domain: 'example.com', sectionKey: '/docs' }}
        deleteAriaLabel="Delete section"
        sort="newest"
        onSortChange={vi.fn()}
        searchSlot={(toolbar) => (
          <div data-testid="custom-search">
            search input
            {toolbar}
          </div>
        )}
      />
    );

    expect(screen.getByTestId('custom-search')).toBeInTheDocument();
    expect(screen.getByTestId('export-actions-mock')).toBeInTheDocument();
  });
});
