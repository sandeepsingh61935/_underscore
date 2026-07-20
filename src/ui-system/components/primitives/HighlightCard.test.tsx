/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L767-795 (V2_HighlightCard)
 * Quote text is immutable; format tools style presentation only.
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

  it('does not show free-edit Edit control', () => {
    render(<HighlightCard quote="Apple" domain="example.com" onCopy={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Edit highlight text/ })).toBeNull();
  });

  it('shows format toolbar without Plain (no-op format removed)', () => {
    render(
      <HighlightCard
        quote="Apple"
        domain="example.com"
        onPresentationChange={vi.fn(async () => undefined)}
      />
    );
    expect(screen.getByTestId('highlight-format-toolbar')).toBeTruthy();
    expect(screen.getByRole('button', { name: /As captured/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Code/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Bullets/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Plain$/i })).toBeNull();
  });

  it('optimistically marks format pressed before save resolves', async () => {
    let resolveSave!: () => void;
    const onPresentationChange = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(
      <HighlightCard
        quote={"line one\nline two"}
        domain="example.com"
        onPresentationChange={onPresentationChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Bullets/i }));
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /Bullets/i }).getAttribute('aria-pressed')).toBe(
        'true',
      );
    });
    expect(onPresentationChange).toHaveBeenCalledWith({ format: 'bullets' });
    resolveSave();
  });

  it('preserves language when switching to code format', async () => {
    const onPresentationChange = vi.fn(async () => undefined);
    render(
      <HighlightCard
        quote="int x = 1;"
        domain="example.com"
        language="cpp"
        sourceKind="code"
        onPresentationChange={onPresentationChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^Code$/i }));
    await vi.waitFor(() => {
      expect(onPresentationChange).toHaveBeenCalledWith({
        format: 'code',
        language: 'cpp',
      });
    });
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

  it('places footerStart on the unified action row with Copy', () => {
    render(
      <HighlightCard
        quote="Apple"
        domain="example.com"
        onCopy={vi.fn()}
        footerStart={<span>+ Add note or tags</span>}
      />
    );
    const row = screen.getByTestId('highlight-action-row');
    expect(row.textContent).toContain('+ Add note or tags');
    expect(row.textContent).toMatch(/Copy/i);
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
});
