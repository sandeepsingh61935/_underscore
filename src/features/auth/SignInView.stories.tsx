import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { SignInView } from './SignInView';

/**
 * Sign In View
 * 
 * **Design Reference**: `/docs/07-design/sign-in/sign-in-image.png`  
 * **Dimensions**: 360px × 600px (Chrome extension popup)
 * 
 * OAuth provider selection screen with disabled state handling.
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
 * Default sign-in view - Google only active
 */
export const Default: Story = {
    args: {
        onGoogleLogin: () => console.log('Google login clicked'),
        onBackToModeSelection: () => console.log('Back to mode selection'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Matches design mockup - only Google provider enabled by default',
            },
        },
    },
};

/**
 * All providers disabled except Google
 */
export const WithDisabledProviders: Story = {
    args: {
        onGoogleLogin: () => console.log('Google login'),
        onAppleLogin: undefined,  // Disabled (38% opacity)
        onXLogin: undefined,      // Disabled (38% opacity)
        onFacebookLogin: undefined, // Disabled (38% opacity)
        onBackToModeSelection: () => console.log('Back'),
    },
    parameters: {
        docs: {
            description: {
                story: '**Critical**: Disabled providers use 38% opacity per MD3 spec (not 40%!)',
            },
        },
    },
};

/**
 * All providers active (testing state)
 */
export const AllProvidersActive: Story = {
    args: {
        onGoogleLogin: () => console.log('Google login'),
        onAppleLogin: () => console.log('Apple login'),
        onXLogin: () => console.log('X login'),
        onFacebookLogin: () => console.log('Facebook login'),
        onBackToModeSelection: () => console.log('Back'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Testing scenario - all OAuth providers active and clickable',
            },
        },
    },
};

/**
 * Without back button (initial flow)
 */
export const NoBackButton: Story = {
    args: {
        onGoogleLogin: () => console.log('Google login'),
        onBackToModeSelection: undefined, // Hide "Mode" button
    },
    parameters: {
        docs: {
            description: {
                story: 'Initial sign-in flow without back navigation',
            },
        },
    },
};
