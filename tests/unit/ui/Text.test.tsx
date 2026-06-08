/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Text } from '../../../src/ui-system/components/primitives/Text';

describe('V2 Text', () => {
    describe('Basic rendering', () => {
        it('renders a p element by default', () => {
            render(<Text>Hello</Text>);
            const el = screen.getByText('Hello');
            expect(el.tagName).toBe('P');
        });

        it('renders an h1 when variant=h1', () => {
            render(<Text variant="h1">Heading</Text>);
            const el = screen.getByText('Heading');
            expect(el.tagName).toBe('H1');
        });

        it('uses V2 ink token for text color (not MD3 text-on-surface)', () => {
            const { container } = render(<Text>Hello</Text>);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--ink)');
        });

        it('uses V2 ink-3 token when muted', () => {
            const { container } = render(<Text muted>Hello</Text>);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--ink-3)');
        });
    });

    describe('V2 step scale mapping', () => {
        it('h1 maps to --step-5 (36px)', () => {
            const { container } = render(<Text variant="h1">x</Text>);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--step-5)');
        });

        it('body maps to --step-0 (13px)', () => {
            const { container } = render(<Text variant="body">x</Text>);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--step-0)');
        });

        it('tiny maps to --step--1 (11px)', () => {
            const { container } = render(<Text variant="tiny">x</Text>);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--step--1)');
        });

        it('label maps to --step--1 (11px)', () => {
            const { container } = render(<Text variant="label">x</Text>);
            const el = container.firstChild as HTMLElement;
            const style = el.getAttribute('style') ?? '';
            expect(style).toContain('var(--step--1)');
        });
    });

    describe('No legacy design system tokens', () => {
        it('does not use MD3 type scale classes', () => {
            const { container } = render(<Text variant="body">x</Text>);
            const cls = container.firstChild?.className ?? '';
            expect(cls).not.toMatch(/text-display-large/);
            expect(cls).not.toMatch(/text-headline-medium/);
            expect(cls).not.toMatch(/text-body-large/);
            expect(cls).not.toMatch(/text-label-small/);
        });

        it('does not use Ink & Glass tokens', () => {
            const { container } = render(<Text variant="body">x</Text>);
            const html = container.innerHTML;
            expect(html).not.toMatch(/--ink-[0-9]/);
        });
    });
});
