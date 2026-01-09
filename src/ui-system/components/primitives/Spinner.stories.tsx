import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Spinner } from './Spinner';

/**
 * Spinner Component
 * 
 * Loading spinner using MD3 colors
 */
const meta = {
    title: 'UI/Primitives/Spinner',
    component: Spinner,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
    args: {
        size: 'sm',
    },
};

export const Large: Story = {
    args: {
        size: 'lg',
    },
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-8 p-4">
            <div className="text-center">
                <Spinner size="sm" />
                <p className="text-label-small text-on-surface-variant mt-2">Small</p>
            </div>
            <div className="text-center">
                <Spinner />
                <p className="text-label-small text-on-surface-variant mt-2">Medium</p>
            </div>
            <div className="text-center">
                <Spinner size="lg" />
                <p className="text-label-small text-on-surface-variant mt-2">Large</p>
            </div>
        </div>
    ),
};
