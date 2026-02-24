import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ModeSelectionPage } from '@/ui-system/pages/ModeSelectionView';

/**
 * Mode Selection View
 * 
 * **Design Reference**: `/docs/07-design/mode-selection/mode-selection-image.png`  
 * **Dimensions**: 360px × 600px (Chrome extension popup)
 * 
 * Initial mode selection screen shown to unauthenticated users.
 * 
 * Note: This story uses the presentational ModeSelectionPage component
 * that doesn't require Router or AppProvider context.
 */
const meta = {
    title: 'Views/ModeSelectionView',
    component: ModeSelectionPage,
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof ModeSelectionPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default mode selection (unauthenticated user)
 */
export const Default: Story = {
    args: {
        selectedMode: 'focus',
        isAuthenticated: false,
        onModeSelect: (modeId: string) => console.log('Selected mode:', modeId),
        onSignInClick: () => console.log('Sign in clicked'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <ModeSelectionPage {...args} />
        </div>
    ),
};

/**
 * Authenticated user - all modes available
 */
export const Authenticated: Story = {
    args: {
        selectedMode: 'focus',
        isAuthenticated: true,
        onModeSelect: (modeId: string) => console.log('Selected mode:', modeId),
        onSignInClick: () => console.log('Sign in clicked'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <ModeSelectionPage {...args} />
        </div>
    ),
};

/**
 * Interaction test - clicking modes
 */
export const InteractionTest: Story = {
    args: {
        selectedMode: 'capture',
        isAuthenticated: false,
        onModeSelect: (modeId: string) => {
            console.log('Mode clicked:', modeId);
            alert(`You selected: ${modeId}`);
        },
        onSignInClick: () => alert('Sign in to unlock Memory and Neural modes'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <ModeSelectionPage {...args} />
        </div>
    ),
};
