import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { HighlightCard } from './HighlightCard';

const meta: Meta<typeof HighlightCard> = {
    title: 'UI System/Composed/HighlightCard',
    component: HighlightCard,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        onCopy: { action: 'copied' },
        onDelete: { action: 'deleted' },
        onNavigate: { action: 'navigated' },
    },
};

export default meta;
type Story = StoryObj<typeof HighlightCard>;

const mockHighlight = {
    id: '1',
    text: 'The key to building great products is understanding that users don\'t care about your technology — they care about solving their problems.',
    urlPath: '/blog/product-design-principles',
    createdAt: new Date(),
    colorRole: 'yellow' as const,
};

export const Default: Story = {
    args: {
        highlight: mockHighlight,
    },
    render: (args) => (
        <div className="w-[400px]">
            <HighlightCard {...args} />
        </div>
    ),
};

export const LongText: Story = {
    args: {
        highlight: {
            ...mockHighlight,
            id: '2',
            text: 'This is a much longer highlight that spans multiple lines and should be truncated with an ellipsis to prevent the card from becoming too tall. The user can view the full text by clicking on the card or expanding it somehow.',
        },
    },
    render: (args) => (
        <div className="w-[400px]">
            <HighlightCard {...args} />
        </div>
    ),
};

export const BlueColor: Story = {
    args: {
        highlight: {
            ...mockHighlight,
            id: '3',
            colorRole: 'blue',
            text: 'TypeScript provides static type checking at compile time, catching errors before they reach production.',
        },
    },
    render: (args) => (
        <div className="w-[400px]">
            <HighlightCard {...args} />
        </div>
    ),
};

export const OlderHighlight: Story = {
    args: {
        highlight: {
            ...mockHighlight,
            id: '4',
            colorRole: 'green',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            text: 'Design systems are collections of reusable components, guided by clear standards.',
        },
    },
    render: (args) => (
        <div className="w-[400px]">
            <HighlightCard {...args} />
        </div>
    ),
};

export const Stack: Story = {
    render: () => (
        <div className="flex flex-col gap-3 w-[400px]">
            <HighlightCard
                highlight={{
                    id: '1',
                    text: 'React makes it painless to create interactive UIs.',
                    urlPath: '/docs/getting-started',
                    createdAt: new Date(),
                    colorRole: 'yellow',
                }}
                onCopy={() => { }}
                onDelete={() => { }}
            />
            <HighlightCard
                highlight={{
                    id: '2',
                    text: 'Design declarative views for each state in your application.',
                    urlPath: '/docs/declarative',
                    createdAt: new Date(Date.now() - 86400000),
                    colorRole: 'blue',
                }}
                onCopy={() => { }}
                onDelete={() => { }}
            />
            <HighlightCard
                highlight={{
                    id: '3',
                    text: 'Build encapsulated components that manage their own state.',
                    urlPath: '/docs/components',
                    createdAt: new Date(Date.now() - 172800000),
                    colorRole: 'purple',
                }}
                onCopy={() => { }}
                onDelete={() => { }}
            />
        </div>
    ),
};
