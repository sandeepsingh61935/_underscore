import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Input } from './Input';

/**
 * MD3 Input Component
 * 
 * MD3 text field with label, helper text, and validation states
 */
const meta = {
    title: 'UI/Primitives/Input',
    component: Input,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        error: {
            control: 'boolean',
        },
        disabled: {
            control: 'boolean',
        },
    },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default input field
 */
export const Default: Story = {
    args: {
        placeholder: 'Enter text...',
    },
};

/**
 * With label
 */
export const WithLabel: Story = {
    args: {
        label: 'Email address',
        placeholder: 'you@example.com',
        type: 'email',
    },
};

/**
 * Error state
 */
export const ErrorState: Story = {
    args: {
        label: 'Password',
        type: 'password',
        error: true,
        helperText: 'Password must be at least 8 characters',
        defaultValue: 'short',
    },
};

/**
 * Disabled state (38% opacity per MD3)
 */
export const Disabled: Story = {
    args: {
        label: 'Username',
        placeholder: 'johndoe',
        disabled: true,
        defaultValue: 'Cannot edit',
    },
    parameters: {
        docs: {
            description: {
                story: '**MD3 Spec**: Disabled state uses 38% opacity',
            },
        },
    },
};

/**
 * All states showcase
 */
export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-6 p-4 w-[320px]">
            <div>
                <h3 className="text-title-medium mb-3 text-on-surface">Default</h3>
                <Input placeholder="Enter text..." />
            </div>
            <div>
                <h3 className="text-title-medium mb-3 text-on-surface">With Label</h3>
                <Input label="Email" placeholder="you@example.com" />
            </div>
            <div>
                <h3 className="text-title-medium mb-3 text-on-surface">Error State</h3>
                <Input
                    label="Password"
                    type="password"
                    error
                    helperText="Password too short"
                    defaultValue="123"
                />
            </div>
            <div>
                <h3 className="text-title-medium mb-3 text-on-surface">Disabled</h3>
                <Input label="Username" disabled defaultValue="john_doe" />
            </div>
        </div>
    ),
};
