import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CollectionsView } from './CollectionsView';

/**
 * Collections View
 * 
 * **Design Reference**: `/docs/07-design/Collections/2-d /2-d-image.png`, `/docs/07-design/Collections/vertical/vertical-image.png`  
 * **Dimensions**: 360px × 600px (Chrome extension popup)
 * 
 * Main collections management view with sorting and view mode toggles.
 */
const meta = {
    title: 'Views/CollectionsView',
    component: CollectionsView,
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof CollectionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default collections view with sample data
 */
export const Default: Story = {
    args: {
        onModeClick: (mode: string) => console.log('Mode clicked:', mode),
    },
    parameters: {
        docs: {
            description: {
                story: 'Matches 2-d grid layout design mockup',
            },
        },
    },
};

/**
 * Empty state (no collections yet)
 */
export const EmptyState: Story = {
    render: () => (
        <div className="h-[600px] bg-surface">
            <CollectionsView onModeClick={() => { }} />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Shows empty state message when user has no collections',
            },
        },
    },
};

/**
 * Grid view (2-d layout)
 */
export const GridView: Story = {
    args: {
        onModeClick: () => { },
    },
    parameters: {
        docs: {
            description: {
                story: 'Grid layout (2-d) from design mockup - cards with elevation shadows',
            },
        },
    },
};

/**
 * List view (vertical layout)
 */
export const ListView: Story = {
    args: {
        onModeClick: () => { },
    },
    parameters: {
        docs: {
            description: {
                story: 'Vertical list layout from design mockup',
            },
        },
    },
};
