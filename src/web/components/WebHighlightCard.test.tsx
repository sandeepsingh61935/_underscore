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
      />,
    );

    expect(screen.getByText(/Hello world/)).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-tag-h1-craft"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.textContent).toMatch(
      /Add note/,
    );
  });

  it('opens note editor and saves via callback', async () => {
    const onNoteSave = vi.fn().mockResolvedValue(true);
    render(
      <WebHighlightCard
        highlight={base}
        onNoteSave={onNoteSave}
        onTagsChange={vi.fn().mockResolvedValue(true)}
      />,
    );

    fireEvent.click(document.querySelector('[data-od-id="hl-note-h1"]')!);
    const ta = document.querySelector(
      '[data-od-id="hl-note-edit-h1"] textarea',
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
      />,
    );

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-add-h1"]')!);
    const input = document.querySelector(
      '[data-od-id="hl-tag-edit-h1"] input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Tokens' } });
    fireEvent.click(document.querySelector('[data-od-id="hl-tag-addbtn-h1"]')!);

    await waitFor(() => {
      expect(onTagsChange).toHaveBeenCalledWith('h1', ['craft', 'tokens']);
    });
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
      />,
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
      />,
    );

    expect(document.querySelector('[data-od-id="hl-tag-add-h1"]')).toBeNull();
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.textContent).toMatch(
      /Saved note/,
    );
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.tagName).toBe('DIV');
  });

  it('main region opens page', () => {
    const onOpenPage = vi.fn();
    render(<WebHighlightCard highlight={base} onOpenPage={onOpenPage} />);
    fireEvent.click(document.querySelector('[data-od-id="hl-main-h1"]')!);
    expect(onOpenPage).toHaveBeenCalledWith('example.com', '/docs');
  });
});
