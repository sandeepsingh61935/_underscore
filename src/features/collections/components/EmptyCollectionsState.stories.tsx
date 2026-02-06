import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { EmptyCollectionsState } from './EmptyCollectionsState';

/**
 * Empty Collections State Component
 * 
 * Shown when user has no collections yet
 */
const meta = {
    title: 'Components/EmptyCollectionsState',
    component: EmptyCollectionsState,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof EmptyCollectionsState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InContext: Story = {
    render: () => (
        <div className="w-[420px] h-[400px] bg-surface p-4 flex items-center justify-center">
            <EmptyCollectionsState />
        </div>
    ),
};
