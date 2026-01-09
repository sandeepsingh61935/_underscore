import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Logo } from './Logo';

/**
 * Logo Component
 * 
 * Underscore logo with MD3 styling
 */
const meta = {
    title: 'UI/Primitives/Logo',
    component: Logo,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default logo (medium size)
 */
export const Default: Story = {
    args: {
        size: 'md',
    },
};

/**
 * Small logo (for compact headers)
 */
export const Small: Story = {
    args: {
        size: 'sm',
    },
};

/**
 * Large logo (for welcome screens)
 */
export const Large: Story = {
    args: {
        size: 'lg',
    },
};

/**
 * Logo variants showcase
 */
export const AllSizes: Story = {
    render: () => (
        <div className="flex items-end gap-8 p-4">
            <div className="text-center">
                <Logo size="sm" />
                <p className="text-label-small text-on-surface-variant mt-2">Small</p>
            </div>
            <div className="text-center">
                <Logo size="md" />
                <p className="text-label-small text-on-surface-variant mt-2">Medium</p>
            </div>
            <div className="text-center">
                <Logo size="lg" />
                <p className="text-label-small text-on-surface-variant mt-2">Large</p>
            </div>
        </div>
    ),
};
