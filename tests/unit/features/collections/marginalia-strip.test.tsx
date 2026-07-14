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

  it('shows the empty invite state', () => {
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '+ Add note or label' })).toBeTruthy();
  });

  it('expanded: omits NOTE header and shows Done inside the shared notes|tags tray', () => {
    render(
      <MarginaliaStrip highlightId="hl-1" isExpanded onToggleExpand={vi.fn()} />,
    );

    expect(screen.queryByText(/^Note$/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();

    const notes = screen.getByPlaceholderText('What stood out?');
    const addLabel = screen.getByLabelText('Add label');
    const tray = notes.closest('[data-testid="marginalia-tray"]');
    expect(tray).not.toBeNull();
    expect(tray).toContainElement(addLabel);
    expect(tray).toContainElement(screen.getByRole('button', { name: 'Done' }));
  });

  it('collapsed: mirrors Notes|Tags in one shared tray with Edit', () => {
    render(
      <MarginaliaStrip
        highlightId="hl-1"
        notes="Central metaphor"
        labels={['research', 'comedy']}
        isExpanded={false}
        onToggleExpand={vi.fn()}
      />,
    );

    const note = screen.getByText('Central metaphor');
    const tray = note.closest('[data-testid="marginalia-tray"]');
    expect(tray).not.toBeNull();
    expect(tray).toContainElement(screen.getByText('research'));
    expect(tray).toContainElement(screen.getByText('comedy'));
    expect(tray).toContainElement(screen.getByText('Edit'));
    expect(screen.queryByText(/^Note$/i)).toBeNull();
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
