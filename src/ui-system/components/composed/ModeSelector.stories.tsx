import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ModeSelector } from './ModeSelector';

const meta: Meta<typeof ModeSelector> = {
    title: 'UI System/Composed/ModeSelector',
    component: ModeSelector,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        onSelect: { action: 'selected' },
    },
};

export default meta;
type Story = StoryObj<typeof ModeSelector>;

export const Authenticated: Story = {
    args: {
        currentModeId: 'focus',
        isAuthenticated: true,
    },
    render: (args) => (
        <div className="w-[380px]">
            <ModeSelector {...args} />
        </div>
    )
};

export const Unauthenticated: Story = {
    args: {
        currentModeId: 'focus',
        isAuthenticated: false,
    },
    render: (args) => (
        <div className="w-[380px]">
            <ModeSelector {...args} />
        </div>
    )
};
