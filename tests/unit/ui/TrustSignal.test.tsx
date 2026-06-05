/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustSignal } from '../../../src/ui-system/components/primitives/TrustSignal';

describe('V2 TrustSignal', () => {
    it('renders the trust message', () => {
        render(<TrustSignal />);
        expect(
            screen.getByText(/Your data stays yours/i),
        ).toBeInTheDocument();
    });

    it('uses V2 ink token for text color (not Style C text-outline)', () => {
        const { container } = render(<TrustSignal />);
        const el = container.querySelector('p') as HTMLElement;
        const style = el.getAttribute('style') ?? '';
        expect(style).toContain('var(--ink-3)');
        // --text-* / --outline* are Style C / MD3 aliases — must not appear
        expect(style).not.toMatch(/--text-/);
        expect(style).not.toMatch(/--outline\b/);
    });

    it('uses V2 step scale for font size (not MD3 text-body-small)', () => {
        const { container } = render(<TrustSignal />);
        const el = container.querySelector('p') as HTMLElement;
        const style = el.getAttribute('style') ?? '';
        expect(style).toContain('var(--step--1)');
        expect(el.className).not.toMatch(/text-body-small/);
    });

    it('does not use banned Tailwind arbitrary utilities', () => {
        const { container } = render(<TrustSignal />);
        const el = container.querySelector('p') as HTMLElement;
        expect(el.className).not.toMatch(/tracking-wide/);
        expect(el.className).not.toMatch(/text-body-small/);
        expect(el.className).not.toMatch(/text-outline/);
    });
});
