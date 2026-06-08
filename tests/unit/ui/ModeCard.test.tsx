/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeCard } from '../../../src/ui-system/components/composed/ModeCard';

describe('V2 ModeCard', () => {
    it('renders label and description', () => {
        render(
            <ModeCard
                id="ephemeral"
                label="Focus"
                description="Capture content without distractions."
                onClick={vi.fn()}
            />
        );
        expect(screen.getByText('Focus')).toBeInTheDocument();
        expect(screen.getByText(/Capture content without distractions/)).toBeInTheDocument();
    });

    it('aria-pressed reflects isActive state', () => {
        const { rerender } = render(
            <ModeCard id="local" label="Capture" isActive onClick={vi.fn()} />
        );
        expect(screen.getByText('Capture').closest('button')).toHaveAttribute('aria-pressed', 'true');

        rerender(<ModeCard id="local" label="Capture" onClick={vi.fn()} />);
        expect(screen.getByText('Capture').closest('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('aria-disabled reflects isLocked state', () => {
        render(
            <ModeCard id="cloud" label="Memory" isLocked onClick={vi.fn()} />
        );
        expect(screen.getByText('Memory').closest('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('active state uses V2 --accent surface and --paper text', () => {
        const { baseElement } = render(
            <ModeCard id="ephemeral" label="Focus" isActive onClick={vi.fn()} />
        );
        const html = baseElement.innerHTML;
        expect(html).toContain('var(--accent)');
        expect(html).toContain('var(--paper)');
    });

    it('does not use Style C, MD3, or shadcn utility classes', () => {
        const { baseElement } = render(
            <ModeCard
                id="local"
                label="Capture"
                description="High-speed capture session."
                isActive
                onClick={vi.fn()}
            />
        );
        const html = baseElement.innerHTML;
        // Style C
        expect(html).not.toMatch(/bg-primary\b/);
        expect(html).not.toMatch(/text-primary-foreground/);
        expect(html).not.toMatch(/bg-on-primary/);
        expect(html).not.toMatch(/text-on-primary/);
        expect(html).not.toMatch(/text-on-surface/);
        expect(html).not.toMatch(/text-on-surface-variant/);
        expect(html).not.toMatch(/border-outline/);
        expect(html).not.toMatch(/border-outline-variant/);
        expect(html).not.toMatch(/bg-surface-container/);
        expect(html).not.toMatch(/text-muted-foreground/);
        // MD3 type scale
        expect(html).not.toMatch(/text-title-medium/);
        expect(html).not.toMatch(/text-title-small/);
        expect(html).not.toMatch(/text-body-small/);
        // shadcn shadow + arbitrary rounded
        expect(html).not.toMatch(/shadow-md/);
        expect(html).not.toMatch(/shadow-sm/);
        expect(html).not.toMatch(/shadow-none/);
        expect(html).not.toMatch(/rounded-xl/);
        expect(html).not.toMatch(/rounded-\[/);
    });

    it('uses V2 step scale for label and description type', () => {
        const { baseElement } = render(
            <ModeCard
                id="ai"
                label="Neural"
                description="AI-powered organization."
                isActive
                onClick={vi.fn()}
            />
        );
        const html = baseElement.innerHTML;
        expect(html).toMatch(/font-(?:size|Size):\s*var\(--step-/);
    });
});
