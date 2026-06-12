/**
 * Wireframe: ui_kits/extension/v2/tokens.css L329-343 (.u-card-row CSS)
 * V2 contract: V2 surface card. background --paper-2, border --rule-soft
 *   (or --rule when elevated), text --ink. No box-shadows. padding p-4.
 *   interactive -> <button> for click target.
 *
 * Note: wireframe has `.u-card-row` for LIST ROWS (hover state) which is
 * a separate primitive; this Card is the surface card pattern.
 * Legacy-DS guard tests live at tests/unit/ui/Card.test.tsx (13 tests).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, CardTitle, CardDescription, CardFooter } from './Card';

describe('Card (V2 surface)', () => {
  it('renders a div with --paper-2 background by default', () => {
    const { container } = render(<Card>body</Card>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe('DIV');
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--paper-2)');
  });

  it('renders --rule-soft border by default and --rule when elevated', () => {
    const { container, rerender } = render(<Card>x</Card>);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--rule-soft)');
    expect(style).not.toContain('var( --rule )');

    rerender(<Card elevated>x</Card>);
    const elevated = container.firstElementChild as HTMLElement;
    const elevatedStyle = elevated.getAttribute('style') ?? '';
    expect(elevatedStyle).toContain('var( --rule )');
  });

  it('renders a <button> element when interactive is true', () => {
    render(<Card interactive>body</Card>);
    expect(screen.getByRole('button', { name: 'body' })).toBeTruthy();
  });

  it('CardTitle uses --ink for color and serif font', () => {
    render(<CardTitle>Title</CardTitle>);
    const el = screen.getByText('Title');
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--ink)');
    expect(el.className).toContain('font-serif');
  });

  it('CardDescription uses --ink-2 for muted body text', () => {
    render(<CardDescription>Body</CardDescription>);
    const el = screen.getByText('Body');
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--ink-2)');
  });

  it('CardFooter uses --rule-soft for the top divider border', () => {
    const { container } = render(<CardFooter>footer</CardFooter>);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--rule-soft)');
  });
});
