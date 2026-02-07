import type { Meta, StoryObj } from '@storybook/react';
import { ProviderButton } from './ProviderButton';

const meta: Meta<typeof ProviderButton> = {
    title: 'UI System/Composed/ProviderButton',
    component: ProviderButton,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        onClick: { action: 'clicked' },
    },
};

export default meta;
type Story = StoryObj<typeof ProviderButton>;

export const Google: Story = {
    args: {
        provider: 'google',
    },
    render: (args) => <div className="w-[320px]"><ProviderButton {...args} /></div>
};

export const Apple: Story = {
    args: {
        provider: 'apple',
    },
    render: (args) => <div className="w-[320px]"><ProviderButton {...args} /></div>
};

export const X: Story = {
    args: {
        provider: 'x',
    },
    render: (args) => <div className="w-[320px]"><ProviderButton {...args} /></div>
};

export const Facebook: Story = {
    args: {
        provider: 'facebook',
    },
    render: (args) => <div className="w-[320px]"><ProviderButton {...args} /></div>
};

export const Loading: Story = {
    args: {
        provider: 'google',
        isLoading: true,
    },
    render: (args) => <div className="w-[320px]"><ProviderButton {...args} /></div>
};

export const Disabled: Story = {
    args: {
        provider: 'github',
        disabled: true,
    },
    render: (args) => <div className="w-[320px]"><ProviderButton {...args} /></div>
};

export const Stack: Story = {
    render: () => (
        <div className="flex flex-col gap-3 w-[320px]">
            <ProviderButton provider="google" />
            <ProviderButton provider="apple" />
            <ProviderButton provider="x" />
            <ProviderButton provider="facebook" />
            <ProviderButton provider="github" />
        </div>
    ),
};
