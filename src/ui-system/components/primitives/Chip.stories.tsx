import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Chip } from './Chip';

const meta = {
    title: 'UI/Primitives/Chip',
    component: Chip,
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Filter' } };
export const Selected: Story = { args: { children: 'Selected', selected: true } };
export const Disabled: Story = { args: { children: 'Disabled', disabled: true } };

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2 p-4">
            <Chip>Default</Chip>
            <Chip selected>Selected</Chip>
            <Chip disabled>Disabled</Chip>
        </div>
    ),
};
