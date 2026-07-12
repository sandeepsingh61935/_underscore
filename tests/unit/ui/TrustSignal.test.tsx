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
            screen.getByText(/Your highlights stay on your device/i),
        ).toBeInTheDocument();
    });

    it('uses V2 ink token for text color (not Style C text-outline)', () => {
        const { container } = render(<TrustSignal />);
        const el = container.querySelector('span.u-sans') as HTMLElement;
        const style = el.getAttribute('style') ?? '';
        expect(style).toContain('var( --ink-3 )');
        expect(style).not.toMatch(/--text-/);
        expect(style).not.toMatch(/--outline\b/);
    });

    it('uses inline font size (not MD3 text-body-small)', () => {
        const { container } = render(<TrustSignal />);
        const el = container.querySelector('span.u-sans') as HTMLElement;
        const style = el.getAttribute('style') ?? '';
        expect(style).toContain('11');
        expect(el.className).not.toMatch(/text-body-small/);
    });

    it('does not use banned Tailwind arbitrary utilities', () => {
        const { container } = render(<TrustSignal />);
        const el = container.querySelector('span.u-sans') as HTMLElement;
        expect(el.className).not.toMatch(/tracking-wide/);
        expect(el.className).not.toMatch(/text-body-small/);
        expect(el.className).not.toMatch(/text-outline/);
    });
});
