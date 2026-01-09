import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CollectionCard } from './CollectionCard';

/**
 * Collection Card Component
 * 
 * **Design Reference**: `/docs/07-design/Collections/2-d /2-d-image.png`
 * 
 * Individual collection card showing domain and underscore count
 */
const meta = {
    title: 'Components/CollectionCard',
    component: CollectionCard,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof CollectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        domain: 'dribbble.com',
        count: 3,
        description: 'Design Inspiration',
        onClick: () => console.log('Card clicked'),
    },
};

export const HighCount: Story = {
    args: {
        domain: 'github.com',
        count: 47,
        description: 'Code Repositories',
        onClick: () => console.log('Card clicked'),
    },
};

export const NoDescription: Story = {
    args: {
        domain: 'stackoverflow.com',
        count: 12,
        onClick: () => console.log('Card clicked'),
    },
};
