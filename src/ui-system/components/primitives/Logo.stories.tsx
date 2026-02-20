import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Logo } from './Logo';

const meta = {
    title: 'UI/Primitives/Logo',
    component: Logo,
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
    argTypes: { showText: { control: 'boolean' } },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { showText: true } };
export const IconOnly: Story = { args: { showText: false } };

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col items-start gap-8 p-4">
            <div>
                <Logo showText />
                <p className="text-label-small text-on-surface-variant mt-2">With text</p>
            </div>
            <div>
                <Logo showText={false} />
                <p className="text-label-small text-on-surface-variant mt-2">Icon only</p>
            </div>
        </div>
    ),
};
