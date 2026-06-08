/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeSelector } from '../../../src/ui-system/components/composed/ModeSelector';

describe('V2 ModeSelector', () => {
    it('renders one card per V2 mode (ephemeral, local, cloud, ai)', () => {
        render(
            <ModeSelector currentModeId="ephemeral" onSelect={vi.fn()} />
        );
        expect(screen.getByText('Focus')).toBeInTheDocument();
        expect(screen.getByText('Capture')).toBeInTheDocument();
        expect(screen.getByText('Memory')).toBeInTheDocument();
        expect(screen.getByText('Neural')).toBeInTheDocument();
    });

    it('does not use Style C or MD3 utility classes', () => {
        const { baseElement } = render(
            <ModeSelector currentModeId="local" onSelect={vi.fn()} />
        );
        const html = baseElement.innerHTML;
        expect(html).not.toMatch(/bg-card/);
        expect(html).not.toMatch(/bg-secondary/);
        expect(html).not.toMatch(/text-muted-foreground/);
        expect(html).not.toMatch(/text-foreground/);
        expect(html).not.toMatch(/border-border/);
        expect(html).not.toMatch(/shadow-/);
        expect(html).not.toMatch(/text-title-medium/);
        expect(html).not.toMatch(/text-title-small/);
    });

    it('forwards currentModeId as active card', () => {
        render(
            <ModeSelector currentModeId="cloud" onSelect={vi.fn()} />
        );
        const memoryCard = screen.getByText('Memory').closest('button');
        expect(memoryCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('invokes onSelect with the mode id when a card is clicked', () => {
        const onSelect = vi.fn();
        render(
            <ModeSelector currentModeId="ephemeral" onSelect={onSelect} />
        );
        screen.getByText('Capture').closest('button')!.click();
        expect(onSelect).toHaveBeenCalledWith('local');
    });

    it('marks cloud and ai as locked when unauthenticated', () => {
        render(
            <ModeSelector
                currentModeId="ephemeral"
                onSelect={vi.fn()}
                isAuthenticated={false}
            />
        );
        const memoryCard = screen.getByText('Memory').closest('button');
        const neuralCard = screen.getByText('Neural').closest('button');
        expect(memoryCard).toHaveAttribute('aria-disabled', 'true');
        expect(neuralCard).toHaveAttribute('aria-disabled', 'true');
    });
});
