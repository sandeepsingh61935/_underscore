import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SignInView } from '@/ui-system/pages/SignInView';

/**
 * Sign In View
 * 
 * **Design Reference**: `/docs/07-design/sign-in/sign-in-image.png`  
 * **Dimensions**: 360px × 600px (Chrome extension popup)
 * 
 * OAuth provider selection screen with disabled state handling.
 * 
 * Note: This story uses the presentational SignInView component
 * that doesn't require Router or AppProvider context.
 */
const meta = {
    title: 'Views/SignInView',
    component: SignInView,
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof SignInView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default sign-in view - Google active, Apple disabled
 */
export const Default: Story = {
    args: {
        onProviderSelect: (provider) => console.log('Provider selected:', provider),
        onBack: () => console.log('Back clicked'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <SignInView {...args} />
        </div>
    ),
};

/**
 * With back button
 */
export const WithBack: Story = {
    args: {
        onProviderSelect: (provider) => console.log('Provider selected:', provider),
        onBack: () => console.log('Back clicked'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <SignInView {...args} />
        </div>
    ),
};

/**
 * Loading state
 */
export const Loading: Story = {
    args: {
        onProviderSelect: (provider) => console.log('Provider selected:', provider),
        isLoading: true,
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <SignInView {...args} />
        </div>
    ),
};

/**
 * Error state
 */
export const WithError: Story = {
    args: {
        onProviderSelect: (provider) => console.log('Provider selected:', provider),
        onBack: () => console.log('Back clicked'),
        error: 'Failed to sign in. Please check your internet connection and try again.',
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <SignInView {...args} />
        </div>
    ),
};

/**
 * Without back button (initial flow)
 */
export const NoBackButton: Story = {
    args: {
        onProviderSelect: (provider) => console.log('Provider selected:', provider),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <SignInView {...args} />
        </div>
    ),
};
