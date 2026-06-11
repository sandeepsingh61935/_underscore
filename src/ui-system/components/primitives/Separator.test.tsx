/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L1131-1141 (V2_Separator)
 * V2 contract: hairline 1px tall (horizontal) or 1px wide (vertical) with
 *   var(--rule-soft) background. No inset or label variants in wireframe.
 *   The current impl is a thin Radix wrapper with the same visual contract.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Separator } from './Separator';

describe('Separator (V2 wireframe contract)', () => {
  it('uses --rule-soft as the hairline color', () => {
    const { container } = render(<Separator />);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--rule-soft)');
  });

  it('renders 1px tall in horizontal orientation (default)', () => {
    const { container } = render(<Separator />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/h-\[1px\]/);
    expect(el.className).toMatch(/w-full/);
  });

  it('renders 1px wide in vertical orientation', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/w-\[1px\]/);
    expect(el.className).toMatch(/h-full/);
  });
});
