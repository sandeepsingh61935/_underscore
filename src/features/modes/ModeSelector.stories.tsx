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
    { id: 'focus', name: 'Focus', description: 'Distraction-free highlighting', requiresAuth: false, enabled: true, order: 1 },
    { id: 'capture', name: 'Capture', description: 'Quick save', requiresAuth: false, enabled: true, order: 2 },
    { id: 'memory', name: 'Memory 🔒', description: 'Save across sessions', requiresAuth: true, enabled: true, order: 3, badge: 'Pro' },
    { id: 'neural', name: 'Neural 🔒', description: 'AI-powered', requiresAuth: true, enabled: true, order: 4, badge: 'Pro' },
];

export const Default: Story = {
    args: {
        modes: mockModes,
        currentModeId: 'focus',
        onSelect: (modeId: string) => console.log('Mode changed to:', modeId),
    },
};

export const CaptureSelected: Story = {
    args: {
        modes: mockModes,
        currentModeId: 'capture',
        onSelect: (modeId: string) => console.log('Mode changed to:', modeId),
    },
};

export const WithDisabled: Story = {
    args: {
        modes: mockModes,
        currentModeId: 'focus',
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
