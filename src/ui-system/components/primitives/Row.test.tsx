/**
 * Design contract: src/ui-system/theme/global.css (Row primitive)
 * Design contract: <button> with display:grid, columns auto 1fr auto (when left
 *   is present) or 1fr auto (no left). min-height var(--control-h).
 *   padding 14px var(--type-inset-padding) (default) or 10px (compact).
 *   border-bottom 1px var(--rule-soft). title in var(--ink) /
 *   var(--type-title-row) / 500 weight / ellipsis, sub in var(--ink-3) /
 *   var(--type-label) mono.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Row } from './Row';

describe('Row (V2 wireframe contract)', () => {
  it('renders as a <button> when onClick is provided', () => {
    render(<Row title="Apple" onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('renders as a <div> when onClick is omitted', () => {
    const { container } = render(<Row title="Apple" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.tagName).toBe('DIV');
  });

  it('uses display:grid in inline style', () => {
    render(<Row title="Apple" onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('display: grid');
  });

  it('uses grid-template-columns auto 1fr auto when left is present', () => {
    render(
      <Row
        title="Apple"
        left={<span data-testid="left-icon">A</span>}
        onClick={vi.fn()}
      />
    );
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('auto 1fr auto');
  });

  it('uses grid-template-columns 1fr auto when left is absent', () => {
    render(<Row title="Apple" onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('1fr auto');
  });

  it('enforces min-height var(--control-h)', () => {
    render(<Row title="Apple" onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('var(--control-h)');
  });

  it('uses compact padding 10px var(--type-inset-padding) when compact is true', () => {
    render(<Row title="Apple" compact onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('10px var(--type-inset-padding)');
  });

  it('uses default padding 14px var(--type-inset-padding) when compact is false', () => {
    render(<Row title="Apple" onClick={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('14px var(--type-inset-padding)');
  });

  it('renders the sub prop in mono font below the title', () => {
    render(<Row title="Apple" sub="3h ago" />);
    const sub = screen.getByText('3h ago');
    expect(sub.className).toContain('u-mono');
  });
});
