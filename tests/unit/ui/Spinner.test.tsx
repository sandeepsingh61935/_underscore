/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Spinner } from '../../../src/ui-system/components/primitives/Spinner';

describe('V2 Spinner', () => {
    describe('Basic rendering', () => {
        it('renders a div element', () => {
            const { container } = render(<Spinner />);
            const el = container.firstChild as HTMLElement;
            expect(el).toBeInTheDocument();
            expect(el.tagName).toBe('DIV');
        });

        it('applies the supplied className', () => {
            const { container } = render(<Spinner className="extra" />);
            const el = container.firstChild as HTMLElement;
            expect(el.className).toContain('extra');
        });
    });

    describe('V2 token usage', () => {
        it('uses --rule-soft for the static ring border', () => {
            const { container } = render(<Spinner />);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--rule-soft)');
        });

        it('uses --accent for the rotating top edge', () => {
            const { container } = render(<Spinner />);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--accent)');
        });
    });

    describe('No legacy design system tokens', () => {
        it('does not use MD3 tokens', () => {
            const { container } = render(<Spinner />);
            const html = container.innerHTML;
            expect(html).not.toMatch(/--md-sys-/);
        });

        it('does not use Ink & Glass tokens', () => {
            const { container } = render(<Spinner />);
            const html = container.innerHTML;
            expect(html).not.toMatch(/--ink-[0-9]/);
        });

        it('does not use banned Tailwind outline-variant / primary utilities', () => {
            const { container } = render(<Spinner />);
            const el = container.firstChild as HTMLElement;
            expect(el.className).not.toMatch(/border-outline-variant/);
            expect(el.className).not.toMatch(/border-t-primary/);
        });
    });
});
