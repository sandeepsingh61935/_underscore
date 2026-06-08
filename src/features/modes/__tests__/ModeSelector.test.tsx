import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelector } from '../ModeSelector';
import type { ModeDefinition } from '../registry';

const mockModes: ModeDefinition[] = [
    {
        id: 'ephemeral',
        name: 'Ephemeral',
        altName: 'Non-persistent',
        family: 'local',
        tag: '24-hour memory',
        blurb: 'Test blurb 1',
        motif: '◷',
        accent: 'var(--mode-ephemeral)',
        persistence: 'auto-expires',
        signin: false,
        ttl: true,
        enabled: true,
        order: 1,
    },
    {
        id: 'cloud',
        name: 'Cloud',
        altName: 'Persistent cloud',
        family: 'cloud',
        tag: 'Synced',
        blurb: 'Test blurb 2',
        motif: '◇',
        accent: 'var(--mode-cloud)',
        persistence: 'synced',
        signin: true,
        ttl: false,
        enabled: true,
        order: 2,
        badge: 'New',
    }
];

describe('ModeSelector', () => {
    it('renders all modes with names, descriptions, and badges', () => {
        render(
            <ModeSelector
                modes={mockModes}
                currentModeId="ephemeral"
                onSelect={() => {}}
            />
        );

        // Check first mode
        expect(screen.getByText('Ephemeral')).toBeInTheDocument();
        expect(screen.getByText('Test blurb 1')).toBeInTheDocument();

        // Check second mode with badge
        expect(screen.getByText('Cloud')).toBeInTheDocument();
        expect(screen.getByText('Test blurb 2')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('fires onSelect with mode ID when clicked', () => {
        const onSelect = vi.fn();
        render(
            <ModeSelector
                modes={mockModes}
                currentModeId="ephemeral"
                onSelect={onSelect}
            />
        );

        fireEvent.click(screen.getByText('Cloud'));
        expect(onSelect).toHaveBeenCalledWith('cloud');
    });

    it('respects disabled prop', () => {
        const onSelect = vi.fn();
        render(
            <ModeSelector
                modes={mockModes}
                currentModeId="ephemeral"
                onSelect={onSelect}
                disabled={true}
            />
        );

        const button = screen.getByText('Cloud').closest('button');
        expect(button).toBeDisabled();
        
        if (button) fireEvent.click(button);
        expect(onSelect).not.toHaveBeenCalled();
    });
});
