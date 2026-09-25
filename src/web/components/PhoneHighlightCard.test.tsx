import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PhoneHighlightCard } from './PhoneHighlightCard';

const baseHighlight = {
  id: 'h1',
  domain: 'example.com',
  path: '/article',
  quote: 'remarkable insight',
  note: 'secret note',
  tags: ['x'],
  savedAt: 1,
};

describe('PhoneHighlightCard', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders copy text action and copies plain quote text', async () => {
    render(
      <PhoneHighlightCard
        highlight={baseHighlight}
        meta="example.com"
        onOpen={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('remarkable insight');
  });

  it('renders copy quote link action and copies text-fragment URL', async () => {
    render(
      <PhoneHighlightCard
        highlight={baseHighlight}
        meta="example.com"
        onOpen={vi.fn()}
      />
    );

    const copyLinkBtn = screen.getByRole('button', { name: 'Copy quote link' });
    expect(copyLinkBtn).toBeInTheDocument();

    fireEvent.click(copyLinkBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://example.com/article#:~:text=remarkable%20insight'
    );
  });

  it('renders actions in consistent order: Copy, Copy quote link, Note, Tags, Open, Delete', () => {
    const { container } = render(
      <PhoneHighlightCard
        highlight={baseHighlight}
        meta="example.com"
        onOpen={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const actionContainer = container.querySelector('.phone-hl-actions');
    expect(actionContainer).toBeInTheDocument();

    const buttonsAndLinks = actionContainer?.querySelectorAll('.phone-ico');
    expect(buttonsAndLinks?.length).toBe(6);

    expect(buttonsAndLinks?.[0]).toHaveAttribute('aria-label', 'Copy');
    expect(buttonsAndLinks?.[1]).toHaveAttribute('aria-label', 'Copy quote link');
    expect(buttonsAndLinks?.[2]).toHaveAttribute('aria-label', 'Edit note');
    expect(buttonsAndLinks?.[3]).toHaveAttribute('aria-label', 'Add tags');
    expect(buttonsAndLinks?.[4]).toHaveAttribute('aria-label', 'Open source');
    expect(buttonsAndLinks?.[5]).toHaveAttribute('aria-label', 'Delete highlight');
  });

  it('toggles note editor and sets active state on note button', () => {
    render(
      <PhoneHighlightCard
        highlight={baseHighlight}
        meta="example.com"
        onOpen={vi.fn()}
      />
    );

    const noteBtn = screen.getByRole('button', { name: 'Edit note' });
    expect(noteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(noteBtn.className).not.toContain('is-active');
    expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();

    fireEvent.click(noteBtn);
    expect(noteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(noteBtn.className).toContain('is-active');
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeInTheDocument();

    fireEvent.click(noteBtn);
    expect(noteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
  });

  it('toggles tag editor and sets active state on tag button', () => {
    render(
      <PhoneHighlightCard
        highlight={baseHighlight}
        meta="example.com"
        onOpen={vi.fn()}
      />
    );

    const tagBtn = screen.getByRole('button', { name: 'Add tags' });
    expect(tagBtn).toHaveAttribute('aria-pressed', 'false');
    expect(tagBtn.className).not.toContain('is-active');
    expect(screen.queryByPlaceholderText('Add tag…')).toBeNull();

    fireEvent.click(tagBtn);
    expect(tagBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tagBtn.className).toContain('is-active');
    expect(screen.getByPlaceholderText('Add tag…')).toBeInTheDocument();
  });

  it('opens note editor when clicking the note display box', () => {
    render(
      <PhoneHighlightCard
        highlight={baseHighlight}
        meta="example.com"
        onOpen={vi.fn()}
      />
    );

    const noteBox = screen.getByText('secret note');
    fireEvent.click(noteBox);

    expect(screen.getByRole('textbox', { name: 'Note' })).toBeInTheDocument();
  });
});
