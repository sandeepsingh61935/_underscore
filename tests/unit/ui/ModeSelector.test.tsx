/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeSelector } from '../../../src/ui-system/components/composed/ModeSelector';

describe('V2 ModeSelector', () => {
    it('renders one card per V3 mode from MODE_BRANDING', () => {
        render(
            <ModeSelector currentModeId="basic" onSelect={vi.fn()} />
        );
        expect(screen.getByText('Guest')).toBeInTheDocument();
        expect(screen.getByText('Account (Free)')).toBeInTheDocument();
        expect(screen.getByText('Account (Paid)')).toBeInTheDocument();
    });

    it('does not use Style C or MD3 utility classes', () => {
        const { baseElement } = render(
            <ModeSelector currentModeId="basic" onSelect={vi.fn()} />
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
            <ModeSelector currentModeId="pro" onSelect={vi.fn()} />
        );
        const proCard = screen.getByText('Account (Free)').closest('button');
        expect(proCard).toHaveAttribute('aria-pressed', 'true');
    });

    it('invokes onSelect with the mode id when a card is clicked', () => {
        const onSelect = vi.fn();
        render(
            <ModeSelector currentModeId="pro" onSelect={onSelect} />
        );
        screen.getByText('Guest').closest('button')!.click();
        expect(onSelect).toHaveBeenCalledWith('basic');
    });

    it('marks pro and pro_xai as locked when unauthenticated', () => {
        render(
            <ModeSelector
                currentModeId="basic"
                onSelect={vi.fn()}
                isAuthenticated={false}
            />
        );
        const proCard = screen.getByText('Account (Free)').closest('button');
        const proXaiCard = screen.getByText('Account (Paid)').closest('button');
        expect(proCard).toHaveAttribute('aria-disabled', 'true');
        expect(proXaiCard).toHaveAttribute('aria-disabled', 'true');
    });
});
