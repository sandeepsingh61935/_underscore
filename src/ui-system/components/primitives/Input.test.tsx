/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L827-850 (V2_Input)
 * V2 contract: 4 states (default/focus/error/disabled), 44px height,
 *   border 1px (var(--rule) default | var(--accent) focus/error),
 *   2px focus ring var(--accent), background var(--paper).
 *   Error: helperText in var(--accent).
 * Legacy-DS guard tests live at tests/unit/ui/Input.test.tsx (9 tests).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input (V2 wireframe contract)', () => {
  it('uses --rule as the default border color', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    const style = input.getAttribute('style') ?? '';
    expect(style).toContain('var(--rule)');
  });

  it('uses --accent for the border when error is true', () => {
    render(<Input placeholder="Email" error />);
    const input = screen.getByPlaceholderText('Email');
    const style = input.getAttribute('style') ?? '';
    expect(style).toContain('var(--accent)');
  });

  it('enforces 44px minimum height via className', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.className).toMatch(/min-h-\[44px\]/);
  });

  it('renders helperText in --accent when error is true', () => {
    render(<Input placeholder="Email" error helperText="Required field" />);
    const helper = screen.getByText('Required field');
    const style = helper.getAttribute('style') ?? '';
    expect(style).toContain('var(--accent)');
  });

  it('forwards disabled to the underlying input element', () => {
    render(<Input placeholder="Email" disabled />);
    const input = screen.getByPlaceholderText('Email') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
