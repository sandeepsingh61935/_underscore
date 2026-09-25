import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ShortcutBadge } from './ShortcutBadge';

describe('ShortcutBadge', () => {
  it('renders standard key combo with + connector', () => {
    const { container } = render(<ShortcutBadge shortcut="Ctrl+U" />);

    expect(screen.getByText('Ctrl')).toBeTruthy();
    expect(screen.getByText('U')).toBeTruthy();
    expect(screen.getByText('+')).toBeTruthy();
    expect(container.querySelectorAll('kbd').length).toBe(2);
  });

  it('renders mouse action as plain gesture text, not a kbd keycap', () => {
    const { container } = render(<ShortcutBadge shortcut="Click highlight" />);

    expect(container.querySelectorAll('kbd').length).toBe(0);
    expect(screen.getByText('Click highlight')).toBeTruthy();
  });

  it('renders hybrid key + mouse gesture properly', () => {
    const { container } = render(<ShortcutBadge shortcut="Ctrl+Click on highlight" />);

    // 'Ctrl' should be a kbd
    expect(container.querySelectorAll('kbd').length).toBe(1);
    expect(screen.getByText('Ctrl')).toBeTruthy();
    expect(screen.getByText('+')).toBeTruthy();
    // 'click on highlight' should be regular text
    expect(screen.getByText('click on highlight')).toBeTruthy();
  });

  it('renders multiple alternatives separated by "or" instead of a raw dot', () => {
    const { container } = render(<ShortcutBadge shortcut="Ctrl+Shift+Z · Ctrl+Y" />);

    expect(screen.getByText('or')).toBeTruthy();
    expect(container.querySelectorAll('kbd').length).toBe(5); // Ctrl, Shift, Z, Ctrl, Y
  });

  it('renders Esc or click outside cleanly', () => {
    const { container } = render(<ShortcutBadge shortcut="Esc · Click outside" />);

    expect(container.querySelectorAll('kbd').length).toBe(1);
    expect(screen.getByText('Esc')).toBeTruthy();
    expect(screen.getByText('or')).toBeTruthy();
    expect(screen.getByText('Click outside')).toBeTruthy();
  });

  it('applies accent styling when isOverridden is true', () => {
    const { container } = render(<ShortcutBadge shortcut="Ctrl+H" isOverridden />);

    const kbd = container.querySelector('kbd');
    expect(kbd).not.toBeNull();
    expect(kbd?.style.color).toBe('var(--accent)');
    expect(kbd?.getAttribute('data-overridden')).toBe('true');
    expect(kbd?.style.borderBottom).toContain('var(--accent)');
  });
});
