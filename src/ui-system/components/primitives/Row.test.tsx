/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L308-331 (Row primitive)
 * V2 contract: <button> with display:grid, columns auto 1fr auto (when left
 *   is present) or 1fr auto (no left). min-height 44px. padding 14px 16px
 *   (default) or 10px 16px (compact). border-bottom 1px var(--rule-soft).
 *   title in --ink / 14px / 500 weight / ellipsis, sub in --ink-3 / 10px mono.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Row } from './Row';

describe('Row (V2 wireframe contract)', () => {
  it('renders as a <button> with the title', () => {
    render(<Row title="Apple" />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('uses display:grid in inline style', () => {
    render(<Row title="Apple" />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('display: grid');
  });

  it('uses grid-template-columns auto 1fr auto when left is present', () => {
    render(
      <Row
        title="Apple"
        left={<span data-testid="left-icon">A</span>}
      />
    );
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('auto 1fr auto');
  });

  it('uses grid-template-columns 1fr auto when left is absent', () => {
    render(<Row title="Apple" />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('1fr auto');
  });

  it('enforces min-height: 44px', () => {
    render(<Row title="Apple" />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('min-height: 44px');
  });

  it('uses compact padding 10px 16px when compact is true', () => {
    render(<Row title="Apple" compact />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('10px 16px');
  });

  it('uses default padding 14px 16px when compact is false', () => {
    render(<Row title="Apple" />);
    const btn = screen.getByRole('button', { name: /Apple/ });
    const style = btn.getAttribute('style') ?? '';
    expect(style).toContain('14px 16px');
  });

  it('renders the sub prop in mono font below the title', () => {
    render(<Row title="Apple" sub="3h ago" />);
    const sub = screen.getByText('3h ago');
    expect(sub.className).toContain('u-mono');
  });
});
