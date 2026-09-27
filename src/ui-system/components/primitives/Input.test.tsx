/**
 * Design contract: src/ui-system/theme/global.css (Input)
 * Design contract: 4 states (default/focus/error/disabled), 44px height,
 *   border 1px (var(--rule-soft) default | var(--accent) focus/error),
 *   2px focus ring var(--accent), background var(--paper).
 *   Error: helperText in var(--accent).
 * Legacy-DS guard tests live at tests/unit/ui/Input.test.tsx (9 tests).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './Input';

describe('Input (V2 wireframe contract)', () => {
  it('uses --rule-soft as the default border color', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    const style = input.getAttribute('style') ?? '';
    expect(style).toContain('var(--rule-soft)');
  });

  it('uses --accent for the border when error is true', () => {
    render(<Input placeholder="Email" error />);
    const input = screen.getByPlaceholderText('Email');
    const style = input.getAttribute('style') ?? '';
    expect(style).toContain('var(--accent)');
  });

  it('uses .input class (44px min-height, paper fill, --radius in CSS)', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.className).toMatch(/\binput\b/);
  });

  it('renders helperText with .is-error when error is true', () => {
    render(<Input placeholder="Email" error helperText="Required field" />);
    const helper = screen.getByText('Required field');
    expect(helper.className).toMatch(/is-error/);
  });

  it('forwards disabled to the underlying input element', () => {
    render(<Input placeholder="Email" disabled />);
    const input = screen.getByPlaceholderText('Email') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
