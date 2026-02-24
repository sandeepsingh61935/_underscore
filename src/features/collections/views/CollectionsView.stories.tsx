import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CollectionsView, Collection } from '@/ui-system/pages/CollectionsView';

/**
 * Collections View
 * 
 * **Design Reference**: `/docs/07-design/Collections/2-d /2-d-image.png`, `/docs/07-design/Collections/vertical/vertical-image.png`  
 * **Dimensions**: 360px × 600px (Chrome extension popup)
 * 
 * Main collections management view with sorting and view mode toggles.
 * 
 * Note: This story uses the presentational CollectionsView from ui-system/pages
 * which doesn't require Router or AppProvider context.
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

const mockCollections: Collection[] = [
    {
        id: '1',
        domain: 'nytimes.com',
        category: 'News & Media',
        count: 24,
        lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
        favicon: 'https://www.nytimes.com/favicon.ico',
    },
    {
        id: '2',
        domain: 'github.com',
        category: 'Development',
        count: 18,
        lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000),
        favicon: 'https://github.com/favicon.ico',
    },
    {
        id: '3',
        domain: 'medium.com',
        category: 'Reading',
        count: 12,
        lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        favicon: 'https://medium.com/favicon.ico',
    },
    {
        id: '4',
        domain: 'dribbble.com',
        category: 'Design',
        count: 6,
        lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        favicon: 'https://dribbble.com/favicon.ico',
    },
];

/**
 * Default collections view with sample data
 */
export const Default: Story = {
    args: {
        collections: mockCollections,
        onCollectionClick: (collection) => console.log('Collection clicked:', collection.domain),
        onAddNew: () => console.log('Add new collection'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background p-4">
            <CollectionsView {...args} />
        </div>
    ),
};

/**
 * Empty state (no collections)
 */
export const EmptyState: Story = {
    args: {
        collections: [],
        onCollectionClick: (collection) => console.log('Collection clicked:', collection.domain),
        onAddNew: () => console.log('Add new collection'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background p-4">
            <CollectionsView {...args} />
        </div>
    ),
};

/**
 * Many collections
 */
export const ManyCollections: Story = {
    args: {
        collections: [
            ...mockCollections,
            { id: '5', domain: 'stackoverflow.com', category: 'Q&A', count: 42, lastAccessed: new Date() },
            { id: '6', domain: 'twitter.com', category: 'Social', count: 15, lastAccessed: new Date() },
            { id: '7', domain: 'reddit.com', category: 'Social', count: 8, lastAccessed: new Date() },
            { id: '8', domain: 'notion.so', category: 'Productivity', count: 31, lastAccessed: new Date() },
        ],
        onCollectionClick: (collection) => console.log('Collection clicked:', collection.domain),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background p-4">
            <CollectionsView {...args} />
        </div>
    ),
};
