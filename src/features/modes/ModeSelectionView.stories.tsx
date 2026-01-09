import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ModeSelectionView } from './ModeSelectionView';

/**
 * Mode Selection View
 * 
 * **Design Reference**: `/docs/07-design/mode-selection/mode-selection-image.png`  
 * **Dimensions**: 360px × 600px (Chrome extension popup)
 * 
 * Initial mode selection screen shown to unauthenticated users.
 */
const meta = {
    title: 'Views/ModeSelectionView',
    component: ModeSelectionView,
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof ModeSelectionView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default mode selection (unauthenticated user)
 */
export const Default: Story = {
    args: {
        onModeSelect: (modeId: string) => console.log('Selected mode:', modeId),
        onSignInClick: () => console.log('Sign in clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows Focus and Capture available, Memory and Neural locked for unauthenticated users',
            },
        },
    },
};

/**
 * Interaction test - clicking disabled modes
 */
export const DisabledModeInteraction: Story = {
    args: {
        onModeSelect: (modeId: string) => {
            console.log('Mode clicked:', modeId);
            alert(`You selected: ${modeId}`);
        },
        onSignInClick: () => alert('Sign in to unlock Memory and Neural modes'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Test clicking locked modes - should not trigger selection',
            },
        },
    },
};
