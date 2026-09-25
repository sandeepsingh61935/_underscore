import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { WebHighlightCard } from './WebHighlightCard';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

const base: WebHighlight = {
  id: 'h1',
  domain: 'example.com',
  path: '/docs',
  quote: 'Hello world',
  note: '',
  tags: ['craft'],
  savedAt: Date.now() - 3600e3,
};

describe('WebHighlightCard', () => {
  it('renders quote, tag chips, and action buttons when editable', () => {
    render(
      <WebHighlightCard
        highlight={base}
        onOpenPage={vi.fn()}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(screen.getByText(/Hello world/)).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-tag-h1-craft"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add note' })).toBeTruthy();
    expect(document.querySelector('.hl-actions')).toBeTruthy();
  });

  it('empty card provides Add tag and Add note action buttons below divider', () => {
    render(
      <WebHighlightCard
        highlight={{ ...base, note: '', tags: [] }}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(document.querySelector('.hl-actions')).toBeTruthy();
    const noteBtn = screen.getByRole('button', { name: 'Add note' });
    const tagBtn = screen.getByRole('button', { name: 'Add tags' });
    expect(noteBtn).toBeTruthy();
    expect(tagBtn).toBeTruthy();

    fireEvent.click(noteBtn);
    expect(document.querySelector('[data-od-id="hl-note-edit-h1"]')).toBeTruthy();
  });

  it('opens note editor and saves via callback', async () => {
    const onNoteSave = vi.fn().mockResolvedValue(true);
    render(
      <WebHighlightCard
        highlight={base}
        onNoteSave={onNoteSave}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />
    );

    fireEvent.click(document.querySelector('[data-od-id="hl-note-h1"]')!);
    const ta = document.querySelector(
      '[data-od-id="hl-note-edit-h1"] textarea'
    ) as HTMLTextAreaElement;
    expect(ta).toBeTruthy();
    fireEvent.change(ta, { target: { value: '  my note  ' } });
    fireEvent.click(document.querySelector('[data-od-id="hl-note-save-h1"]')!);

    await waitFor(() => {
      expect(onNoteSave).toHaveBeenCalledWith('h1', 'my note');
    });
  });

  it('adds a tag via edit mode', async () => {
    const onTagsChange = vi.fn().mockResolvedValue(true);
    render(
      <WebHighlightCard
        highlight={base}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={onTagsChange}
      />
    );

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-add-h1"]')!);
    const input = document.querySelector(
      '[data-od-id="hl-tag-edit-h1"] input'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'Tokens' } });
    fireEvent.click(document.querySelector('[data-od-id="hl-tag-addbtn-h1"]')!);

    await waitFor(() => {
      expect(onTagsChange).toHaveBeenCalledWith('h1', ['craft', 'tokens']);
    });
    // Optimistic UI shows the new tag immediately
    expect(document.querySelector('[data-od-id="hl-tag-chip-h1-tokens"]')).toBeTruthy();
  });

  it('shows inline error and rolls back when tag save fails', async () => {
    const onTagsChange = vi.fn().mockResolvedValue(false);
    render(
      <WebHighlightCard
        highlight={base}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={onTagsChange}
      />
    );

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-add-h1"]')!);
    const input = document.querySelector(
      '[data-od-id="hl-tag-edit-h1"] input'
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'failme' } });
    fireEvent.click(document.querySelector('[data-od-id="hl-tag-addbtn-h1"]')!);

    await waitFor(() => {
      expect(
        document.querySelector('[data-od-id="hl-tag-error-h1"]')?.textContent
      ).toMatch(/Could not save tag/);
    });
    expect(document.querySelector('[data-od-id="hl-tag-chip-h1-failme"]')).toBeNull();
  });

  it('toggles tag filter on chip click without opening page', () => {
    const onOpenPage = vi.fn();
    const onToggleTagFilter = vi.fn();
    render(
      <WebHighlightCard
        highlight={base}
        onOpenPage={onOpenPage}
        onToggleTagFilter={onToggleTagFilter}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />
    );

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-h1-craft"]')!);
    expect(onToggleTagFilter).toHaveBeenCalledWith('craft');
    expect(onOpenPage).not.toHaveBeenCalled();
  });

  it('readOnly hides edit affordances but shows existing note', () => {
    render(
      <WebHighlightCard
        highlight={{ ...base, note: 'Saved note', tags: ['a'] }}
        readOnly
      />
    );

    expect(document.querySelector('[data-od-id="hl-tag-add-h1"]')).toBeNull();
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.textContent).toMatch(
      /Saved note/
    );
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.tagName).toBe('DIV');
  });

  it('main region opens page', () => {
    const onOpenPage = vi.fn();
    render(<WebHighlightCard highlight={base} onOpenPage={onOpenPage} />);
    fireEvent.click(document.querySelector('[data-od-id="hl-main-h1"]')!);
    expect(onOpenPage).toHaveBeenCalledWith('example.com', '/docs');
  });

  it('delete icon opens confirm dialog and calls onDelete on confirm', async () => {
    const onDelete = vi.fn().mockResolvedValue(true);
    render(
      <WebHighlightCard
        highlight={base}
        onDelete={onDelete}
        onNoteSave={vi.fn().mockResolvedValue(true)}
      />
    );

    fireEvent.click(document.querySelector('[data-od-id="hl-delete-h1"]')!);
    expect(screen.getByTestId('confirm-dialog-message')).toBeTruthy();

    fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('h1');
    });
  });

  it('readOnly hides delete control', () => {
    render(
      <WebHighlightCard
        highlight={base}
        readOnly
        onDelete={vi.fn().mockResolvedValue(true)}
      />
    );
    expect(document.querySelector('[data-od-id="hl-delete-h1"]')).toBeNull();
  });

  it('rail density shows domain only (no path) and existing tags/note inline', () => {
    render(
      <WebHighlightCard
        highlight={{
          ...base,
          path: '/docs/deep/path',
          note: 'Saved note',
          tags: ['craft', 'css'],
        }}
        density="rail"
        showDomain
        readOnly
      />
    );

    const card = document.querySelector('[data-od-id="hl-h1"]');
    expect(card?.textContent).toContain('example.com');
    expect(card?.textContent).not.toContain('/docs/deep/path');
    expect(document.querySelector('.hl-path')).toBeNull();
    expect(document.querySelector('[data-od-id="hl-extras-toggle-h1"]')).toBeNull();
    expect(document.querySelector('[data-od-id="hl-tag-h1-craft"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.textContent).toMatch(
      /Saved note/
    );
  });

  it('rail density omits note/tag display blocks when empty, but provides consistent action buttons', () => {
    render(
      <WebHighlightCard
        highlight={{ ...base, note: '', tags: [] }}
        density="rail"
        showDomain
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(document.querySelector('.hl-tags')).toBeNull();
    expect(document.querySelector('.hl-note')).toBeNull();
    expect(document.querySelector('.hl-actions [data-od-id="hl-copy-text-h1"]')).toBeTruthy();
    expect(document.querySelector('.hl-actions [data-od-id="hl-link-h1"]')).toBeTruthy();
    expect(document.querySelector('.hl-actions [data-od-id="hl-note-h1"]')).toBeTruthy();
    expect(document.querySelector('.hl-actions [data-od-id="hl-tag-add-h1"]')).toBeTruthy();
    expect(document.querySelector('.hl-actions [data-od-id="hl-open-h1"]')).toBeTruthy();
    expect(document.querySelector('.hl-actions [data-od-id="hl-delete-h1"]')).toBeTruthy();
  });

  it('renders copy quote link button and writes fragment URL to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <WebHighlightCard
        highlight={{
          ...base,
          quote: 'remarkable insight',
          domain: 'example.com',
          path: '/article',
        }}
      />
    );

    const linkBtn = document.querySelector('[data-od-id="hl-link-h1"]') as HTMLButtonElement;
    expect(linkBtn).toBeTruthy();
    expect(linkBtn.getAttribute('aria-label')).toBe('Copy direct link to quote');

    fireEvent.click(linkBtn);
    expect(writeTextMock).toHaveBeenCalledWith(
      'https://example.com/article#:~:text=remarkable%20insight'
    );
  });

  it('uses a text-fragment href on the path link', () => {
    render(
      <WebHighlightCard
        highlight={{
          ...base,
          quote: 'remarkable insight',
          domain: 'example.com',
          path: '/article',
        }}
      />
    );
    const path = document.querySelector('.hl-path-link') as HTMLAnchorElement;
    expect(path).toBeTruthy();
    expect(path.getAttribute('target')).toBe('_blank');
    expect(path.getAttribute('href')).toBe(
      'https://example.com/article#:~:text=remarkable%20insight'
    );
  });

  it('renders 6 action buttons in consistent order: Copy, Link, Note, Tag, Open, Delete', () => {
    const { container } = render(
      <WebHighlightCard
        highlight={{
          ...base,
          quote: 'remarkable insight',
          domain: 'example.com',
          path: '/article',
        }}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
        onDelete={vi.fn().mockResolvedValue(true)}
      />
    );

    const actionContainer = container.querySelector('.hl-actions');
    expect(actionContainer).toBeTruthy();

    const buttonsAndLinks = actionContainer?.querySelectorAll('.hl-ico');
    expect(buttonsAndLinks?.length).toBe(6);

    expect(buttonsAndLinks?.[0]).toHaveAttribute('aria-label', 'Copy');
    expect(buttonsAndLinks?.[1]).toHaveAttribute('aria-label', 'Copy direct link to quote');
    expect(buttonsAndLinks?.[2]).toHaveAttribute('aria-label', 'Add note');
    expect(buttonsAndLinks?.[3]).toHaveAttribute('aria-label', 'Add tags');
    expect(buttonsAndLinks?.[4]).toHaveAttribute('aria-label', 'Open source');
    expect(buttonsAndLinks?.[5]).toHaveAttribute('aria-label', 'Delete highlight');
  });

  it('toggles note editor and sets active state on note button', () => {
    render(
      <WebHighlightCard
        highlight={base}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />
    );

    const noteBtn = screen.getByRole('button', { name: 'Add note' });
    expect(noteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(noteBtn.className).not.toContain('is-active');
    expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();

    fireEvent.click(noteBtn);
    expect(noteBtn).toHaveAttribute('aria-pressed', 'true');
    expect(noteBtn.className).toContain('is-active');
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeTruthy();

    fireEvent.click(noteBtn);
    expect(noteBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
  });

  it('toggles tag editor and sets active state on tag button', () => {
    render(
      <WebHighlightCard
        highlight={base}
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />
    );

    const tagBtn = screen.getByRole('button', { name: 'Add tags' });
    expect(tagBtn).toHaveAttribute('aria-pressed', 'false');
    expect(tagBtn.className).not.toContain('is-active');
    expect(screen.queryByPlaceholderText('Add tag…')).toBeNull();

    fireEvent.click(tagBtn);
    expect(tagBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tagBtn.className).toContain('is-active');
    expect(screen.getByPlaceholderText('Add tag…')).toBeTruthy();
  });

  it('opens note editor when clicking the note display box', () => {
    render(
      <WebHighlightCard
        highlight={{ ...base, note: 'Saved thoughts' }}
        onNoteSave={vi.fn().mockResolvedValue(true)}
      />
    );

    const noteBox = screen.getByText('Saved thoughts');
    fireEvent.click(noteBox);

    expect(screen.getByRole('textbox', { name: 'Note' })).toBeTruthy();
  });
});
