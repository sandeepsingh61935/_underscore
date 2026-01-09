import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Chip } from './Chip';

/**
 * MD3 Chip Component
 * 
 * MD3 chip for tags, filters, and selections
 */
const meta = {
    title: 'UI/Primitives/Chip',
    component: Chip,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        label: 'Filter',
    },
};

export const Selected: Story = {
    args: {
        label: 'Selected',
        selected: true,
    },
};

export const WithIcon: Story = {
    args: {
        label: 'Tag',
        icon: '🏷️',
    },
};

export const Disabled: Story = {
    args: {
        label: 'Disabled',
        disabled: true,
    },
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2 p-4">
            <Chip label="Default" />
            <Chip label="Selected" selected />
            <Chip label="With Icon" icon="✨" />
            <Chip label="Disabled" disabled />
        </div>
    ),
};
