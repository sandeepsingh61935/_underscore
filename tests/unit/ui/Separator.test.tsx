/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from '../../../src/ui-system/components/primitives/Separator';

describe('V2 Separator', () => {
    it('renders as a horizontal separator by default', () => {
        const { container } = render(<Separator />);
        const el = container.firstChild as HTMLElement;
        expect(el).toBeInTheDocument();
        // default orientation should produce h-[1px] w-full
        expect(el.className).toMatch(/h-\[1px\]/);
    });

    it('uses --rule-soft for the divider line (not MD3 outline-variant)', () => {
        const { container } = render(<Separator />);
        const el = container.firstChild as HTMLElement;
        const style = el.getAttribute('style') ?? '';
        expect(style).toContain('var(--rule-soft)');
    });

    it('does not use banned Tailwind/MD3 utility classes', () => {
        const { container } = render(<Separator />);
        const el = container.firstChild as HTMLElement;
        expect(el.className).not.toMatch(/bg-outline-variant/);
    });
});
