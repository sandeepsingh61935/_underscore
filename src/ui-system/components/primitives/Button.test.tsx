/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L233-262 (.btn CSS in tokens.css)
 * V2 contract: 4 variants (default/primary/accent/ghost), 2 sizes (md/sm),
 * 44px touch target on md, transparent loading state.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('renders children inside a button with the .btn class', () => {
    const { getByText, container } = render(<Button>Save</Button>);
    expect(getByText('Save').tagName).toBe('BUTTON');
    expect(container.firstElementChild!.className).toContain('btn');
  });

  it('applies .btn.primary class for variant="primary"', () => {
    const { container } = render(<Button variant="primary">Save</Button>);
    expect(container.firstElementChild!.className).toContain('primary');
  });

  it('applies .btn.accent class for variant="accent"', () => {
    const { container } = render(<Button variant="accent">Save</Button>);
    expect(container.firstElementChild!.className).toContain('accent');
  });

  it('applies .btn.ghost class for variant="ghost"', () => {
    const { container } = render(<Button variant="ghost">Cancel</Button>);
    expect(container.firstElementChild!.className).toContain('ghost');
  });

  it('applies .btn.sm class for size="sm"', () => {
    const { container } = render(<Button size="sm">Compact</Button>);
    expect(container.firstElementChild!.className).toContain('sm');
  });

  it('reflects the disabled attribute when disabled is true', () => {
    const { container } = render(<Button disabled>Off</Button>);
    const button = container.firstElementChild as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('renders a loading label and disables the button when isLoading is true', () => {
    const { getByText, container } = render(<Button isLoading>Save</Button>);
    expect(getByText('Loading...')).toBeTruthy();
    expect((container.firstElementChild as HTMLButtonElement).disabled).toBe(true);
  });
});
