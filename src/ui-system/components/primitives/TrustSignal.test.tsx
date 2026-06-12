/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L746-760 (V2_TrustSignal)
 * V2 contract:
 *   - Container: inline-flex, items center, gap 8.
 *   - Lock SVG: 12x12, viewBox 0 0 24 24, stroke var(--ink-3), strokeWidth 1.6.
 *   - Text: "Your data stays yours — encrypted and private", .u-sans, 11px, var(--ink-3), 0.02em tracking.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TrustSignal } from './TrustSignal';

describe('TrustSignal (V2 wireframe contract)', () => {
    it('renders the trust copy', () => {
        const { container } = render(<TrustSignal />);
        expect(container.textContent).toMatch(/Your data stays yours — encrypted and private/);
    });

    it('renders the lock icon SVG', () => {
        const { container } = render(<TrustSignal />);
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('stroke')).toBe('var(--ink-3)');
        expect(svg?.getAttribute('stroke-width')).toBe('1.6');
    });

    it('uses inline-flex layout with 8px gap', () => {
        const { container } = render(<TrustSignal />);
        const root = container.firstElementChild as HTMLElement;
        expect(root.style.display).toBe('inline-flex');
        expect(root.style.gap).toBe('8px');
    });

    it('uses correct typography and color tokens', () => {
        const { container } = render(<TrustSignal />);
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span?.className).toContain('u-sans');
        expect(span?.style.color).toBe('var(--ink-3)');
        expect(span?.style.fontSize).toBe('11px');
        expect(span?.style.letterSpacing).toBe('0.02em');
    });
});
