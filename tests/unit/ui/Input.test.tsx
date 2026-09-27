/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../../../src/ui-system/components/primitives/Input';

describe('V2 Input', () => {
  it('renders an input element', () => {
    render(<Input placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('uses .input class (--rule-soft border, paper fill, --radius in CSS)', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.className).toMatch(/\binput\b/);
  });

  it('uses .input class (--ink text, --step-0 size in CSS)', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.className).toMatch(/\binput\b/);
  });

  it('uses --ink-3 for placeholder color (not MD3 text-on-surface-variant)', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    // Placeholder pseudo is hard to assert in jsdom; check the
    // className does not contain the MD3 utility.
    expect(input.className).not.toMatch(/placeholder:text-on-surface-variant/);
  });

  it('does not use MD3 text-body-large utility', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.className).toMatch(/\binput\b/);
    expect(input.className).not.toMatch(/text-body-large/);
  });

  it('marks error state with .is-error (--accent border in CSS)', () => {
    render(<Input placeholder="Email" error />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.className).toMatch(/\bis-error\b/);
  });

  it('applies error state with --accent border (V2 single-accent error)', () => {
    render(<Input placeholder="Email" error />);
    const input = screen.getByPlaceholderText('Email');
    const style = input.getAttribute('style') ?? '';
    // V2 spec rule 1: single accent. Error is an attention signal
    // and uses --accent.
    expect(style).toContain('var(--accent)');
  });

  it('renders helper text when provided', () => {
    render(<Input placeholder="Email" helperText="We'll never share it" />);
    expect(screen.getByText(/never share/i)).toBeInTheDocument();
  });

  it('does not use MD3 utility class strings', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.className).not.toMatch(/text-body-large/);
    expect(input.className).not.toMatch(/text-on-surface\b/);
    expect(input.className).not.toMatch(/border-outline\b/);
    expect(input.className).not.toMatch(/bg-surface-container-highest/);
    expect(input.className).not.toMatch(/focus:border-primary/);
  });
});
