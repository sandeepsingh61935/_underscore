/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from '../../../src/ui-system/components/primitives/Chip';

describe('V2 Chip', () => {
    describe('Basic rendering', () => {
        it('renders a button element', () => {
            render(<Chip>Tag</Chip>);
            expect(screen.getByRole('button', { name: 'Tag' })).toBeInTheDocument();
        });

        it('uses V2 --rule-soft border (not MD3 border-outline-variant)', () => {
            const { container } = render(<Chip>x</Chip>);
            const html = container.innerHTML;
            expect(html).toContain('var(--rule-soft)');
        });

        it('uses a V2 ink token for text (not MD3 text-on-surface)', () => {
            const { container } = render(<Chip>x</Chip>);
            const html = container.innerHTML;
            // --ink (default) or --ink-2 (muted) are both V2 — at least one must appear
            expect(html).toMatch(/var\(--ink(?:-[0-9])?\)/);
        });
    });

    describe('No legacy design system tokens', () => {
        it('does not use MD3 --md-sys- color tokens', () => {
            const { container } = render(<Chip>x</Chip>);
            const html = container.innerHTML;
            expect(html).not.toMatch(/--md-sys-/);
        });

        it('does not use MD3 text-on-surface-variant utility', () => {
            const { container } = render(<Chip>x</Chip>);
            const html = container.innerHTML;
            expect(html).not.toMatch(/text-on-surface-variant/);
        });
    });
});
