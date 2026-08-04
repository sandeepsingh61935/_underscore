import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { MarginaliaStrip } from '@/features/collections/components/MarginaliaStrip';

const updateMetadata = vi.fn().mockResolvedValue(true);

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: () => ({ updateMetadata }),
}));

describe('MarginaliaStrip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    updateMetadata.mockClear();
    updateMetadata.mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('invite: shows + Add note or tags when collapsed and empty', () => {
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '+ Add note or tags' })).toBeTruthy();
    expect(screen.queryByTestId('marginalia-tray')).toBeNull();
  });

  it('invite: clicking expands via onToggleExpand', () => {
    const onToggleExpand = vi.fn();
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        isExpanded={false}
        onToggleExpand={onToggleExpand}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '+ Add note or tags' }));
    expect(onToggleExpand).toHaveBeenCalledOnce();
  });

  it('expanded: omits NOTE header and shows Done inside the shared notes|tags tray', () => {
    render(
      <MarginaliaStrip highlightId="hl-1" isExpanded onToggleExpand={vi.fn()} />,
    );

    expect(screen.queryByText(/^Note$/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();

    const notes = screen.getByPlaceholderText('What stood out?');
    const addTag = screen.getByLabelText('Add tag');
    const tray = notes.closest('[data-testid="marginalia-tray"]');
    expect(tray).not.toBeNull();
    expect(tray).toContainElement(addTag);
    expect(tray).toContainElement(screen.getByRole('button', { name: 'Done' }));
    expect(tray?.getAttribute('data-empty')).toBe('true');
  });

  it('persists tags-only when a tag is added (does not send notes field)', async () => {
    updateMetadata.mockResolvedValue(true);
    render(
      <MarginaliaStrip highlightId="hl-1" isExpanded onToggleExpand={vi.fn()} />,
    );

    const input = screen.getByLabelText('Add tag');
    fireEvent.change(input, { target: { value: 'bfs' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await act(async () => {
      await Promise.resolve();
    });

    expect(updateMetadata).toHaveBeenCalledWith(
      'hl-1',
      { tags: ['bfs'] },
      { silent: true },
    );
  });

  it('does not wipe local tags when props refresh empty while expanded', async () => {
    updateMetadata.mockResolvedValue(true);
    const { rerender } = render(
      <MarginaliaStrip
        highlightId="hl-1"
        isExpanded
        onToggleExpand={vi.fn()}
        labels={[]}
      />,
    );

    const input = screen.getByLabelText('Add tag');
    fireEvent.change(input, { target: { value: 'cpp' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await act(async () => {
      await Promise.resolve();
    });

    // Parent re-renders with stale empty tags while still expanded
    rerender(
      <MarginaliaStrip
        highlightId="hl-1"
        isExpanded
        onToggleExpand={vi.fn()}
        labels={[]}
      />,
    );

    expect(screen.getByText('cpp')).toBeTruthy();
  });

  it('collapsed: snip + pills in shared tray with Edit (standalone)', () => {
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        notes="Central metaphor"
        labels={['research', 'comedy']}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />,
    );

    const note = screen.getByTestId('marginalia-note-snip');
    expect(note.textContent).toBe('Central metaphor');
    const tray = note.closest('[data-testid="marginalia-tray"]');
    expect(tray).not.toBeNull();
    expect(tray).toContainElement(screen.getByText('research'));
    expect(tray).toContainElement(screen.getByText('comedy'));
    expect(tray).toContainElement(screen.getByText('Edit'));
    expect(screen.queryByText(/^Note$/i)).toBeNull();
  });

  it('collapsed: caps visible tags at two and shows +N overflow', () => {
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        labels={['css', 'fundamentals', 'cascade', 'layout']}
        isExpanded={false}
        onToggleExpand={vi.fn()}
        embedInCard
      />,
    );

    expect(screen.getByText('css')).toBeTruthy();
    expect(screen.getByText('fundamentals')).toBeTruthy();
    expect(screen.queryByText('cascade')).toBeNull();
    expect(screen.getByTestId('marginalia-tag-overflow').textContent).toBe('+2');
  });

  it('collapsed (embed): snip + pills without secondary Edit label', () => {
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        notes="Cascade order"
        labels={['css']}
        isExpanded={false}
        onToggleExpand={vi.fn()}
        embedInCard
      />,
    );

    expect(screen.getByTestId('marginalia-note-snip').textContent).toBe('Cascade order');
    expect(screen.getByText('css')).toBeTruthy();
    expect(screen.queryByText(/^Edit$/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit note and tags' })).toBeTruthy();
  });

  it('does not disable the note field while saving', async () => {
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        isExpanded
        onToggleExpand={vi.fn()}
      />,
    );

    const notes = screen.getByPlaceholderText('What stood out?');
    fireEvent.change(notes, { target: { value: 'Typing works' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(notes).not.toBeDisabled();
    expect(screen.getByText('Saving…')).toBeTruthy();
    expect(updateMetadata).toHaveBeenCalled();
  });
});
