import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CollectionCard } from './CollectionCard';

const meta: Meta<typeof CollectionCard> = {
    title: 'UI System/Composed/CollectionCard',
    component: CollectionCard,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        onClick: { action: 'clicked' },
    },
};

export default meta;
type Story = StoryObj<typeof CollectionCard>;

export const Default: Story = {
    args: {
        domain: 'github.com',
        count: 24,
        favicon: 'https://github.com/favicon.ico',
    },
    render: (args) => (
        <div className="w-[350px]">
            <CollectionCard {...args} />
        </div>
    ),
};

export const WithCategory: Story = {
    args: {
        domain: 'developer.mozilla.org',
        category: 'Documentation',
        count: 156,
        favicon: 'https://developer.mozilla.org/favicon.ico',
    },
    render: (args) => (
        <div className="w-[350px]">
            <CollectionCard {...args} />
        </div>
    ),
};

export const NoFavicon: Story = {
    args: {
        domain: 'example.com',
        count: 3,
    },
    render: (args) => (
        <div className="w-[350px]">
            <CollectionCard {...args} />
        </div>
    ),
};

export const SingleHighlight: Story = {
    args: {
        domain: 'news.ycombinator.com',
        category: 'News',
        count: 1,
        favicon: 'https://news.ycombinator.com/favicon.ico',
    },
    render: (args) => (
        <div className="w-[350px]">
            <CollectionCard {...args} />
        </div>
    ),
};

export const Stack: Story = {
    render: () => (
        <div className="flex flex-col gap-3 w-[350px]">
            <CollectionCard
                domain="github.com"
                count={24}
                favicon="https://github.com/favicon.ico"
            />
            <CollectionCard
                domain="developer.mozilla.org"
                category="Documentation"
                count={156}
                favicon="https://developer.mozilla.org/favicon.ico"
            />
            <CollectionCard
                domain="stackoverflow.com"
                category="Q&A"
                count={89}
                favicon="https://stackoverflow.com/favicon.ico"
            />
            <CollectionCard
                domain="medium.com"
                category="Articles"
                count={42}
            />
        </div>
    ),
};
