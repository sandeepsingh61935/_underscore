import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ModeSelector } from './ModeSelector';

/**
 * Mode Selector Component
 * 
 * **Design Reference**: `/docs/07-design/mode-selection/mode-selection-image.png`
 * 
 * Mode tabs showing current tab
 */
const meta = {
    title: 'Components/ModeSelector',
    component: ModeSelector,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof ModeSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockModes = [
    { id: 'ephemeral', name: 'Ephemeral', description: 'Distraction-free highlighting', requiresAuth: false, enabled: true, order: 1 },
    { id: 'local', name: 'Local', description: 'Quick save', requiresAuth: false, enabled: true, order: 2 },
    { id: 'cloud', name: 'Cloud [locked]', description: 'Save across sessions', requiresAuth: true, enabled: true, order: 3, badge: 'Pro' },
    { id: 'ai', name: 'AI [locked]', description: 'AI-powered', requiresAuth: true, enabled: true, order: 4, badge: 'Pro' },
];

export const Default: Story = {
    args: {
        modes: mockModes,
        currentModeId: 'ephemeral',
        onSelect: (modeId: string) => console.log('Mode changed to:', modeId),
    },
};

export const CaptureSelected: Story = {
    args: {
        modes: mockModes,
        currentModeId: 'local',
        onSelect: (modeId: string) => console.log('Mode changed to:', modeId),
    },
};

export const WithDisabled: Story = {
    args: {
        modes: mockModes,
        currentModeId: 'ephemeral',
        onSelect: (modeId: string) => console.log('Mode changed to:', modeId),
        disabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: 'All modes disabled - uses 50% opacity',
            },
        },
    },
};
