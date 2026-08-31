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
  it('renders quote, tag chips, and Add note when editable', () => {
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
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.textContent).toMatch(
      /Add note/
    );
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

    const main = document.querySelector('[data-od-id="hl-main-h1"]');
    expect(main?.textContent).toContain('example.com');
    expect(main?.textContent).not.toContain('/docs/deep/path');
    expect(document.querySelector('.hl-path')).toBeNull();
    expect(document.querySelector('[data-od-id="hl-extras-toggle-h1"]')).toBeNull();
    expect(document.querySelector('[data-od-id="hl-tag-h1-craft"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.textContent).toMatch(
      /Saved note/
    );
  });

  it('rail density omits tags/note chrome when neither exists', () => {
    render(
      <WebHighlightCard
        highlight={{ ...base, note: '', tags: [] }}
        density="rail"
        showDomain
        onNoteSave={vi.fn().mockResolvedValue(true)}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(document.querySelector('[data-od-id="hl-tags-h1"]')).toBeNull();
    expect(document.querySelector('[data-od-id="hl-note-h1"]')).toBeNull();
    expect(document.querySelector('.hl-foot')).toBeNull();
  });
});
