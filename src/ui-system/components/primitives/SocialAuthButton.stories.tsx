import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SocialAuthButton } from './SocialAuthButton';

const meta = {
    title: 'UI/Primitives/SocialAuthButton',
    component: SocialAuthButton,
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <div className="w-[360px] flex flex-col gap-3 p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof SocialAuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Google: Story = { args: { provider: 'google' } };
export const Apple: Story = { args: { provider: 'apple' } };
export const Phone: Story = { args: { provider: 'phone' } };
export const Loading: Story = { args: { provider: 'google', isLoading: true } };
export const Disabled: Story = { args: { provider: 'google', disabled: true } };

export const AllProviders: Story = {
    render: () => (
        <div className="w-[360px] flex flex-col gap-3 p-4">
            <SocialAuthButton provider="google" />
            <SocialAuthButton provider="apple" />
            <SocialAuthButton provider="phone" />
        </div>
    ),
};
