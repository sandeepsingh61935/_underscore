/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import type { SearchField } from '@/shared/utils/highlight-search';
import type { RefineFilter } from '@/shared/utils/highlight-filter';

function baseProps(
  overrides: Partial<React.ComponentProps<typeof HighlightSearchBar>> = {}
): React.ComponentProps<typeof HighlightSearchBar> {
  return {
    query: '',
    onQueryChange: vi.fn(),
    fields: ['text', 'notes', 'tags', 'domain'] as SearchField[],
    onFieldsChange: vi.fn(),
    refine: [] as RefineFilter[],
    onRefineChange: vi.fn(),
    tagFilters: [] as string[],
    onTagFiltersChange: vi.fn(),
    availableTags: [
      { label: 'css', n: 4 },
      { label: 'cascade', n: 2 },
      { label: 'shipping', n: 1 },
    ],
    ...overrides,
  };
}

describe('HighlightSearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces onQueryChange while typing', () => {
    const props = baseProps();
    render(<HighlightSearchBar {...props} />);

    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'neural' } });

    expect(props.onQueryChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(props.onQueryChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(props.onQueryChange).toHaveBeenCalledTimes(1);
    expect(props.onQueryChange).toHaveBeenCalledWith('neural');
  });

  it('clears immediately without waiting for the debounce', () => {
    const props = baseProps();
    render(<HighlightSearchBar {...props} />);

    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'neural' } });

    fireEvent.click(screen.getByLabelText('Clear'));

    expect(props.onQueryChange).toHaveBeenCalledWith('');
    expect((input as HTMLInputElement).value).toBe('');

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(props.onQueryChange).toHaveBeenCalledTimes(1);
  });

  it('hides the clear button when the input is empty', () => {
    render(<HighlightSearchBar {...baseProps()} />);
    expect(screen.queryByLabelText('Clear')).not.toBeInTheDocument();
  });

  it('syncs inputValue from an externally-changed query prop', () => {
    const props = baseProps({ query: 'first' });
    const { rerender } = render(<HighlightSearchBar {...props} />);

    const input = screen.getByLabelText('Search') as HTMLInputElement;
    expect(input.value).toBe('first');

    rerender(<HighlightSearchBar {...props} query="" />);
    expect(input.value).toBe('');
  });

  it('shows Filters control and opens the panel', () => {
    render(<HighlightSearchBar {...baseProps()} />);
    const filtersBtn = screen.getByRole('button', { name: 'Filters' });
    expect(filtersBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(filtersBtn);
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByLabelText('Fields')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
  });

  it('shows active filter count on Filters when refine is set', () => {
    render(<HighlightSearchBar {...baseProps({ refine: ['has_notes', 'has_tags'] })} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByLabelText('Active filters')).toBeInTheDocument();
    expect(screen.getByText('With notes')).toBeInTheDocument();
  });

  it('toggles multi-select field chips inside the panel', () => {
    const props = baseProps({
      fields: ['text', 'notes', 'tags', 'domain'] as SearchField[],
    });
    render(<HighlightSearchBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const fieldGroup = screen.getByLabelText('Fields');
    fireEvent.click(fieldGroup.querySelector('.field-chip:nth-child(2)') as HTMLElement);
    expect(props.onFieldsChange).toHaveBeenCalledWith(['text', 'tags', 'domain']);
  });

  it('toggles refine chips', () => {
    const props = baseProps({ refine: [] as RefineFilter[] });
    render(<HighlightSearchBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'With notes' }));
    expect(props.onRefineChange).toHaveBeenCalledWith(['has_notes']);
  });

  it('resets filters from the panel footer', () => {
    const props = baseProps({
      fields: ['text'] as SearchField[],
      refine: ['has_notes'] as RefineFilter[],
      tagFilters: ['css'],
    });
    render(<HighlightSearchBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(props.onFieldsChange).toHaveBeenCalledWith([
      'text',
      'notes',
      'tags',
      'domain',
    ]);
    expect(props.onRefineChange).toHaveBeenCalledWith([]);
    expect(props.onTagFiltersChange).toHaveBeenCalledWith([]);
  });

  it('dismisses an active refine chip from the summary row', () => {
    const props = baseProps({ refine: ['needs_note'] as RefineFilter[] });
    render(<HighlightSearchBar {...props} />);
    fireEvent.click(screen.getByLabelText('Remove No notes'));
    expect(props.onRefineChange).toHaveBeenCalledWith([]);
  });

  it('never renders a scope pill (search scope is implicit from the parent view)', () => {
    render(<HighlightSearchBar {...baseProps()} />);
    expect(screen.queryByText(/^in: /i)).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('disables the input when disabled is true', () => {
    render(<HighlightSearchBar {...baseProps({ disabled: true })} />);
    expect(screen.getByLabelText('Search')).toBeDisabled();
  });

  it('does not render search-meta-row or search-count when resultCount is provided', () => {
    const { container, rerender } = render(
      <HighlightSearchBar {...baseProps({ query: 'x', resultCount: 1 })} />
    );
    expect(container.querySelector('.search-meta-row')).toBeNull();
    expect(container.querySelector('.search-count')).toBeNull();
    expect(screen.queryByText('1')).not.toBeInTheDocument();

    rerender(<HighlightSearchBar {...baseProps({ query: 'x', resultCount: 12 })} />);
    expect(container.querySelector('.search-meta-row')).toBeNull();
    expect(screen.queryByText('12')).not.toBeInTheDocument();

    rerender(
      <HighlightSearchBar
        {...baseProps({ query: '', refine: ['has_notes'], resultCount: 0 })}
      />
    );
    expect(container.querySelector('.search-meta-row')).toBeNull();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('selects a popular tag from the filter panel', () => {
    const props = baseProps();
    render(<HighlightSearchBar {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: '#css' }));
    expect(props.onTagFiltersChange).toHaveBeenCalledWith(['css']);
  });

  it('renders actions slot alongside the search input row', () => {
    render(
      <HighlightSearchBar
        {...baseProps()}
        actions={<button type="button">Custom Action</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument();
  });
});
