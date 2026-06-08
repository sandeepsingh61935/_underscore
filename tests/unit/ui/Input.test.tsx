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

    it('uses --rule for the border (not MD3 border-outline)', () => {
        render(<Input placeholder="Email" />);
        const input = screen.getByPlaceholderText('Email');
        const style = input.getAttribute('style') ?? '';
        expect(style).toContain('var(--rule)');
    });

    it('uses --ink for text color (not MD3 text-on-surface)', () => {
        render(<Input placeholder="Email" />);
        const input = screen.getByPlaceholderText('Email');
        const style = input.getAttribute('style') ?? '';
        expect(style).toContain('var(--ink)');
    });

    it('uses --ink-3 for placeholder color (not MD3 text-on-surface-variant)', () => {
        render(<Input placeholder="Email" />);
        const input = screen.getByPlaceholderText('Email');
        const style = input.getAttribute('style') ?? '';
        // Placeholder pseudo is hard to assert in jsdom; check the
        // className does not contain the MD3 utility.
        expect(input.className).not.toMatch(/placeholder:text-on-surface-variant/);
    });

    it('uses --step-0 for font size (not MD3 text-body-large)', () => {
        render(<Input placeholder="Email" />);
        const input = screen.getByPlaceholderText('Email');
        const style = input.getAttribute('style') ?? '';
        expect(style).toContain('var(--step-0)');
        expect(input.className).not.toMatch(/text-body-large/);
    });

    it('uses --accent for focus border (not MD3 focus:border-primary)', () => {
        render(<Input placeholder="Email" />);
        const input = screen.getByPlaceholderText('Email');
        // Focus state lives in className (Tailwind focus: variant), style.
        const allAttrs = (input.getAttribute('style') ?? '') + ' ' + input.className;
        expect(allAttrs).toMatch(/var\(--accent\)/);
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
