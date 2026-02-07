import type { Meta, StoryObj } from '@storybook/react';
import { SignInView } from './SignInView';

const meta: Meta<typeof SignInView> = {
    title: 'UI System/Pages/SignInView',
    component: SignInView,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
        onBack: { action: 'back' },
        onProviderSelect: { action: 'provider selected' },
    },
};

export default meta;
type Story = StoryObj<typeof SignInView>;

export const Default: Story = {
    args: {},
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl">
            <SignInView {...args} />
        </div>
    )
};

export const WithBack: Story = {
    args: {
        onBack: () => console.log('back'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl">
            <SignInView {...args} />
        </div>
    )
};

export const Loading: Story = {
    args: {
        isLoading: true,
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl">
            <SignInView {...args} />
        </div>
    )
};

export const Error: Story = {
    args: {
        error: 'Failed to sign in. Please check your internet connection and try again.',
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl">
            <SignInView {...args} />
        </div>
    )
};
