import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from './Button';

/**
 * MD3 Button Component
 * 
 * **Design Reference**: `/docs/07-design/sign-in/sign-in-image.png`  
 * **MD3 Specifications**: `docs/material_design_reference/interaction_design.md`, `elevation.md`
 * 
 * ## MD3 States
 * - **Default**: shadow-elevation-1
 * - **Hover**: 8% state layer overlay + shadow-elevation-2
 * - **Focus**: 12% state layer + 2px primary ring
 * - **Disabled**: **38% opacity** (MD3 spec, not 40%!)
 */
const meta = {
    title: 'UI/Primitives/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['filled', 'outlined', 'text'],
            description: 'Button visual style following MD3 specifications',
        },
        disabled: {
            control: 'boolean',
            description: 'Disabled state (38% opacity per MD3)',
        },
        isLoading: {
            control: 'boolean',
            description: 'Shows loading spinner',
        },
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Primary filled button for high-emphasis actions
 */
export const Filled: Story = {
    args: {
        variant: 'filled',
        children: 'Sign in with Google',
    },
};

/**
 * Disabled state with MD3-compliant 38% opacity
 */
export const FilledDisabled: Story = {
    args: {
        variant: 'filled',
        disabled: true,
        children: 'Sign in with Apple',
    },
    parameters: {
        docs: {
            description: {
                story: '**Critical**: Uses `opacity-disabled` (38%) per MD3 spec, not 40%',
            },
        },
    },
};

/**
 * Loading state with spinner
 */
export const FilledLoading: Story = {
    args: {
        variant: 'filled',
        isLoading: true,
        children: 'Loading...',
    },
};

/**
 * Outlined button for medium-emphasis actions
 */
export const Outlined: Story = {
    args: {
        variant: 'outlined',
        children: 'Back to Dashboard',
    },
};

/**
 * Text button for low-emphasis actions
 */
export const Text: Story = {
    args: {
        variant: 'text',
        children: 'Mode',
    },
};

/**
 * Showcase of all button states
 */
export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-6 p-4">
            <div>
                <h3 className="text-title-medium mb-3 text-on-surface">Filled</h3>
                <div className="flex gap-3">
                    <Button variant="filled">Default</Button>
                    <Button variant="filled" disabled>Disabled</Button>
                    <Button variant="filled" isLoading>Loading</Button>
                </div>
            </div>
            <div>
                <h3 className="text-title-medium mb-3 text-on-surface">Outlined</h3>
                <div className="flex gap-3">
                    <Button variant="outlined">Default</Button>
                    <Button variant="outlined" disabled>Disabled</Button>
                </div>
            </div>
            <div>
                <h3 className="text-title-medium mb-3 text-on-surface">Text</h3>
                <div className="flex gap-3">
                    <Button variant="text">Default</Button>
                    <Button variant="text" disabled>Disabled</Button>
                </div>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Complete showcase of all button variants and states',
            },
        },
    },
};
