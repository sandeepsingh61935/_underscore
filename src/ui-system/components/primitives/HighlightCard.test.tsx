/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L767-795 (V2_HighlightCard)
 * Edit + format tools live in edit mode; read surface has no presentation chips.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HighlightCard } from './HighlightCard';

describe('HighlightCard (V2 wireframe contract)', () => {
  it('uses --paper background and --rule-soft border-bottom', () => {
    const { container } = render(
      <HighlightCard quote="Apple" domain="example.com" />
    );
    const root = container.firstElementChild as HTMLElement;
    const style = root.getAttribute('style') ?? '';
    expect(style).toContain('var(--rule-soft)');
  });

  it('renders the quote in u-serif', () => {
    render(<HighlightCard quote="Important passage." domain="example.com" />);
    const quote = screen.getByText('Important passage.');
    expect(quote.className).toContain('u-serif');
  });

  it('shows Edit when onSaveQuote is provided', () => {
    render(
      <HighlightCard quote="Apple" domain="example.com" onSaveQuote={async () => true} />
    );
    expect(screen.getByRole('button', { name: /Edit highlight text/ })).toBeTruthy();
  });

  it('does not show format toolbar on the read surface', () => {
    render(
      <HighlightCard quote="Apple" domain="example.com" onSaveQuote={async () => true} />
    );
    expect(screen.queryByTestId('highlight-format-toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: /As captured/i })).toBeNull();
  });

  it('shows markdown format tools only after Edit', () => {
    render(
      <HighlightCard quote="Apple" domain="example.com" onSaveQuote={async () => true} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    expect(screen.getByTestId('highlight-format-toolbar')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bold/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bullet list/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Code block \+ pretty-print/i })).toBeTruthy();
  });

  it('enters edit mode and saves markdown via onSaveQuote', async () => {
    const onSaveQuote = vi.fn(async () => true);
    render(
      <HighlightCard quote="Apple" domain="example.com" onSaveQuote={onSaveQuote} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    const textarea = screen.getByLabelText(/Edit highlight markdown/);
    fireEvent.change(textarea, { target: { value: '**Apple**' } });
    fireEvent.click(screen.getByRole('button', { name: /Save highlight text/ }));
    await vi.waitFor(() => {
      expect(onSaveQuote).toHaveBeenCalledWith('**Apple**');
    });
  });

  it('cancels edit mode without calling onSaveQuote when draft is clean', () => {
    const onSaveQuote = vi.fn(async () => true);
    render(
      <HighlightCard quote="Apple" domain="example.com" onSaveQuote={onSaveQuote} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel editing highlight/ }));
    expect(onSaveQuote).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard edits?')).toBeNull();
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it('prompts caution discard when canceling dirty edits', () => {
    const onSaveQuote = vi.fn(async () => true);
    render(
      <HighlightCard quote="Apple" domain="example.com" onSaveQuote={onSaveQuote} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    fireEvent.change(screen.getByLabelText(/Edit highlight markdown/), {
      target: { value: 'Pear' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Cancel editing highlight/ }));
    expect(screen.getByText('Discard edits?')).toBeTruthy();
    fireEvent.click(screen.getByTestId('discard-keep-editing'));
    expect(screen.getByLabelText(/Edit highlight markdown/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cancel editing highlight/ }));
    fireEvent.click(screen.getByTestId('discard-confirm'));
    expect(onSaveQuote).not.toHaveBeenCalled();
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it('undoes format toolbar action via Undo button', () => {
    render(
      <HighlightCard quote="Apple pie" domain="example.com" onSaveQuote={async () => true} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    const textarea = screen.getByLabelText(/Edit highlight markdown/) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);
    fireEvent.select(textarea);
    fireEvent.click(screen.getByRole('button', { name: /^Bold/i }));
    expect(textarea.value).toBe('**Apple** pie');
    fireEvent.click(screen.getByRole('button', { name: /^Undo$/i }));
    expect(textarea.value).toBe('Apple pie');
    fireEvent.click(screen.getByRole('button', { name: /^Redo$/i }));
    expect(textarea.value).toBe('**Apple** pie');
  });

  it('undoes via Ctrl+Z and redoes via Ctrl+Shift+Z', () => {
    render(
      <HighlightCard quote="Hi" domain="example.com" onSaveQuote={async () => true} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    const textarea = screen.getByLabelText(/Edit highlight markdown/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(textarea.value).toBe('Hello');
    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });
    expect(textarea.value).toBe('Hi');
    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(textarea.value).toBe('Hello');
  });

  it('applies bold from the edit format toolbar', () => {
    render(
      <HighlightCard quote="Apple pie" domain="example.com" onSaveQuote={async () => true} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    const textarea = screen.getByLabelText(/Edit highlight markdown/) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);
    fireEvent.select(textarea);
    fireEvent.click(screen.getByRole('button', { name: /^Bold/i }));
    expect(textarea.value).toBe('**Apple** pie');
  });

  it('renders domain in u-mono', () => {
    render(<HighlightCard quote="Apple" domain="example.com" />);
    const meta = screen.getByText('example.com');
    expect(meta.className).toContain('u-mono');
  });

  it('renders "domain/path" when section (path) provided', () => {
    render(<HighlightCard quote="Apple" domain="example.com" section="/notes" />);
    expect(screen.getByText('example.com/notes')).toBeTruthy();
  });

  it('does not render expiry badges', () => {
    render(<HighlightCard quote="Apple" domain="example.com" />);
    expect(screen.queryByText(/expired|left|fresh/i)).toBeNull();
  });

  it('compact density uses asymmetric 10/8 vertical padding', () => {
    const { container } = render(
      <HighlightCard quote="Apple" domain="example.com" density="compact" />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('style') ?? '').toContain('10px 16px 8px');
  });

  it('comfortable density uses asymmetric 12/8 vertical padding', () => {
    const { container } = render(
      <HighlightCard quote="Apple" domain="example.com" density="comfortable" />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('style') ?? '').toContain('12px 16px 8px');
  });

  it('applies Ctrl+B bold wrap on markdown selection', () => {
    render(
      <HighlightCard quote="Apple pie" domain="example.com" onSaveQuote={async () => true} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Edit highlight text/ }));
    const textarea = screen.getByLabelText(/Edit highlight markdown/) as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);
    fireEvent.select(textarea);
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });
    expect(textarea.value).toBe('**Apple** pie');
  });

  it('places footerStart on the unified action row with Edit', () => {
    render(
      <HighlightCard
        quote="Apple"
        domain="example.com"
        onSaveQuote={async () => true}
        footerStart={<span>+ Add note or tags</span>}
      />
    );
    const row = screen.getByTestId('highlight-action-row');
    expect(row.textContent).toContain('+ Add note or tags');
    expect(row.textContent).toMatch(/Edit/i);
  });

  it('renders domain only when section is absent', () => {
    render(<HighlightCard quote="Apple" domain="example.com" />);
    expect(screen.getByText('example.com')).toBeTruthy();
  });

  it('renders meta as plain div when onSectionClick is not provided', () => {
    render(<HighlightCard quote="Apple" domain="example.com" section="/docs" />);
    expect(screen.queryByRole('button', { name: /example\.com/ })).toBeNull();
  });

  it('calls onSectionClick when meta line is clicked', () => {
    const handler = vi.fn();
    render(
      <HighlightCard quote="Apple" domain="example.com" section="/docs" onSectionClick={handler} />
    );
    const btn = screen.getByRole('button', { name: 'example.com/docs' });
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('hides domain/path meta when showLocationMeta is false', () => {
    render(
      <HighlightCard
        quote="Apple"
        domain="example.com"
        section="/notes"
        showLocationMeta={false}
        onCopy={vi.fn()}
      />
    );
    expect(screen.queryByText('example.com/notes')).toBeNull();
    expect(screen.getByRole('button', { name: /Copy highlight text/ })).toBeTruthy();
  });

  it('calls onDelete when delete action is clicked', () => {
    const handler = vi.fn();
    render(
      <HighlightCard quote="Apple" domain="example.com" onDelete={handler} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Delete highlight/ }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders quiet Edit / Copy / Delete text actions when handlers are set', () => {
    render(
      <HighlightCard
        quote="Apple"
        domain="example.com"
        onSaveQuote={async () => true}
        onCopy={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const row = screen.getByTestId('highlight-action-row');
    expect(row.textContent).toMatch(/Edit/i);
    expect(row.textContent).toMatch(/Copy/i);
    expect(row.textContent).toMatch(/Delete/i);
  });

  it('renders match badge under the action row when provided', () => {
    render(
      <HighlightCard
        quote="Apple"
        domain="example.com"
        onCopy={vi.fn()}
        matchBadge="Text · Tags"
      />,
    );
    expect(screen.getByTestId('highlight-match-badge').textContent).toBe('Text · Tags');
  });

  it('omits match badge when not provided', () => {
    render(<HighlightCard quote="Apple" domain="example.com" onCopy={vi.fn()} />);
    expect(screen.queryByTestId('highlight-match-badge')).toBeNull();
  });
});
