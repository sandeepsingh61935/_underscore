import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DomainDetailsView } from './DomainDetailsView';

/**
 * Domain Details View
 * 
 * **Design Reference**: 
 * - Light mode: `/docs/07-design/domain underscore details dashbaord/light mode/light-mode-code-screen.png`
 * - Dark mode: `/docs/07-design/domain underscore details dashbaord/Dark mode/dark-mode-image.png`
 * - Sepia mode: `/docs/07-design/domain underscore details dashbaord/sepia mode/sepia mode-image.png`
 * 
 * Shows detailed view of underscores for a specific domain.
 */
const meta = {
    title: 'Views/DomainDetailsView',
    component: DomainDetailsView,
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof DomainDetailsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default domain details view
 */
export const Default: Story = {
    args: {
        onBack: () => console.log('Back to collections'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows underscores for a specific domain with Export/Clear All actions',
            },
        },
    },
};

/**
 * Light mode (compare with design mockup)
 */
export const LightMode: Story = {
    args: {
        onBack: () => console.log('Back'),
    },
    parameters: {
        backgrounds: { default: 'light' },
        docs: {
            description: {
                story: 'Light mode - compare with /docs/07-design/domain underscore details dashbaord/light mode/',
            },
        },
    },
};

/**
 * Dark mode (compare with design mockup)
 */
export const DarkMode: Story = {
    args: {
        onBack: () => console.log('Back'),
    },
    parameters: {
        backgrounds: { default: 'dark' },
        docs: {
            description: {
                story: 'Dark mode - compare with /docs/07-design/domain underscore details dashbaord/Dark mode/',
            },
        },
    },
};
