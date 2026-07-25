/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import type { SearchField } from '@/shared/utils/highlight-search';

function baseProps(
  overrides: Partial<React.ComponentProps<typeof HighlightSearchBar>> = {}
): React.ComponentProps<typeof HighlightSearchBar> {
  return {
    query: '',
    onQueryChange: vi.fn(),
    fields: ['text', 'notes', 'tags'] as SearchField[],
    onFieldsChange: vi.fn(),
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

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'neural' } });

    // Not called yet — debounce still pending.
    expect(props.onQueryChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(149);
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

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'neural' } });

    fireEvent.click(screen.getByLabelText('Clear search'));

    expect(props.onQueryChange).toHaveBeenCalledWith('');
    expect((input as HTMLInputElement).value).toBe('');

    // Advancing time should not trigger a second, stale call with the typed value.
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(props.onQueryChange).toHaveBeenCalledTimes(1);
  });

  it('hides the clear button when the input is empty', () => {
    render(<HighlightSearchBar {...baseProps()} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('syncs inputValue from an externally-changed query prop', () => {
    const props = baseProps({ query: 'first' });
    const { rerender } = render(<HighlightSearchBar {...props} />);

    const input = screen.getByLabelText('Search highlights') as HTMLInputElement;
    expect(input.value).toBe('first');

    rerender(<HighlightSearchBar {...props} query="" />);
    expect(input.value).toBe('');
  });

  it('selects only Tags when the Tags chip is clicked', () => {
    const props = baseProps({ fields: ['text', 'notes', 'tags'] as SearchField[] });
    render(<HighlightSearchBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(props.onFieldsChange).toHaveBeenCalledWith(['tags']);
  });

  it('selects only Notes when Notes is clicked while All is active', () => {
    const props = baseProps({ fields: ['text', 'notes', 'tags'] as SearchField[] });
    render(<HighlightSearchBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(props.onFieldsChange).toHaveBeenCalledWith(['notes']);
  });

  it('selects only Text when Text is clicked while All is active', () => {
    const props = baseProps({ fields: ['text', 'notes', 'tags'] as SearchField[] });
    render(<HighlightSearchBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Text' }));
    expect(props.onFieldsChange).toHaveBeenCalledWith(['text']);
  });

  it('resets fields to all three when "All" is clicked', () => {
    const props = baseProps({ fields: ['text'] as SearchField[] });
    render(<HighlightSearchBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(props.onFieldsChange).toHaveBeenCalledWith(['text', 'notes', 'tags']);
  });

  it('marks "All" inactive when every individual chip was toggled off', () => {
    const props = baseProps({ fields: [] as SearchField[] });
    render(<HighlightSearchBar {...props} />);

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Text' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('returns to All when the sole active chip is clicked again', () => {
    const props = baseProps({ fields: ['text'] as SearchField[] });
    render(<HighlightSearchBar {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Text' }));
    expect(props.onFieldsChange).toHaveBeenCalledWith(['text', 'notes', 'tags']);
  });

  it('never renders a scope pill (search scope is implicit from the parent view)', () => {
    render(<HighlightSearchBar {...baseProps()} />);
    expect(screen.queryByText(/^in: /)).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders all four field chips on a single, non-wrapping row', () => {
    render(<HighlightSearchBar {...baseProps()} />);
    const chips = [
      screen.getByRole('button', { name: 'All' }),
      screen.getByRole('button', { name: 'Text' }),
      screen.getByRole('button', { name: 'Notes' }),
      screen.getByRole('button', { name: 'Tags' }),
    ];
    const row = chips[0]?.parentElement;
    expect(row).not.toBeNull();
    chips.forEach((chip) => expect(chip.parentElement).toBe(row));
    expect(row).toHaveStyle({ flexWrap: 'nowrap' });
  });

  it('disables the input when disabled is true', () => {
    render(<HighlightSearchBar {...baseProps({ disabled: true })} />);
    expect(screen.getByLabelText('Search highlights')).toBeDisabled();
  });

  it('renders singular, plural, and zero result counts', () => {
    const { rerender } = render(
      <HighlightSearchBar {...baseProps({ query: 'x', resultCount: 1 })} />
    );
    expect(screen.getByText('1 result')).toBeInTheDocument();

    rerender(<HighlightSearchBar {...baseProps({ query: 'x', resultCount: 12 })} />);
    expect(screen.getByText('12 results')).toBeInTheDocument();

    rerender(<HighlightSearchBar {...baseProps({ query: 'x', resultCount: 0 })} />);
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('hides the result count when the query is empty even if resultCount is defined', () => {
    render(<HighlightSearchBar {...baseProps({ query: '', resultCount: 5 })} />);
    expect(screen.queryByText(/results?/)).not.toBeInTheDocument();
  });

  it('hides the result count when resultCount is undefined', () => {
    render(<HighlightSearchBar {...baseProps({ query: 'x', resultCount: undefined })} />);
    expect(screen.queryByText(/results?/)).not.toBeInTheDocument();
  });
});
