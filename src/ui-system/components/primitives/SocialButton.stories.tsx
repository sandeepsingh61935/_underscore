import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SocialButton } from './SocialButton';

const meta = {
    title: 'UI/Primitives/SocialButton',
    component: SocialButton,
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
} satisfies Meta<typeof SocialButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Google: Story = { args: { provider: 'google' } };
export const Apple: Story = { args: { provider: 'apple' } };
export const GitHub: Story = { args: { provider: 'github' } };
export const Disabled: Story = { args: { provider: 'google', disabled: true } };

export const AllProviders: Story = {
    render: () => (
        <div className="flex items-center gap-4 p-4">
            <SocialButton provider="google" />
            <SocialButton provider="apple" />
            <SocialButton provider="github" />
        </div>
    ),
};
