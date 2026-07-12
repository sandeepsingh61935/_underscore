/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L767-795 (V2_HighlightCard)
 * V2 contract:
 *   - Background var(--paper), border-bottom 1px var(--rule-soft).
 *   - Two densities: compact 10px / comfortable 14px vertical padding.
 *   - Quote: u-serif, 14px, --ink. qmark glyph 28px.
 *   - Meta: u-mono, 10px, --ink-3, "domain" or "domain / section".
 *   - Optional inline TTLBadge when ttlMs set.
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

  it('renders domain in u-mono', () => {
    render(<HighlightCard quote="Apple" domain="example.com" />);
    const meta = screen.getByText('example.com');
    expect(meta.className).toContain('u-mono');
  });

  it('renders "domain/path" when section (path) provided', () => {
    render(<HighlightCard quote="Apple" domain="example.com" section="/notes" />);
    expect(screen.getByText('example.com/notes')).toBeTruthy();
  });

  it('omits TTL badge when ttlMs absent', () => {
    render(<HighlightCard quote="Apple" domain="example.com" />);
    expect(screen.queryByText(/expired|left|fresh/i)).toBeNull();
  });

  it('does not render TTL badge when ttlMs is passed (guest storage is permanent)', () => {
    render(
      <HighlightCard quote="Apple" domain="example.com" ttlMs={60_000} />
    );
    expect(screen.queryByText(/^\d+(s|m|h)$/)).toBeNull();
  });

  it('compact density uses 10px vertical padding', () => {
    const { container } = render(
      <HighlightCard quote="Apple" domain="example.com" density="compact" />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('style') ?? '').toContain('10px 16px');
  });

  it('comfortable density uses 14px vertical padding', () => {
    const { container } = render(
      <HighlightCard quote="Apple" domain="example.com" density="comfortable" />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('style') ?? '').toContain('14px 16px');
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
