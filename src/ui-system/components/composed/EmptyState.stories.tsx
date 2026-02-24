import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';
import { Inbox } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
    title: 'UI System/Composed/EmptyState',
    component: EmptyState,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['no-highlights', 'no-collections', 'no-results', 'welcome', 'error', 'custom'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const NoHighlights: Story = {
    args: {
        variant: 'no-highlights',
    },
    render: (args) => (
        <div className="w-[350px] bg-card border border-border rounded-lg">
            <EmptyState {...args} />
        </div>
    ),
};

export const NoCollections: Story = {
    args: {
        variant: 'no-collections',
    },
    render: (args) => (
        <div className="w-[350px] bg-card border border-border rounded-lg">
            <EmptyState {...args} />
        </div>
    ),
};

export const NoResults: Story = {
    args: {
        variant: 'no-results',
    },
    render: (args) => (
        <div className="w-[350px] bg-card border border-border rounded-lg">
            <EmptyState {...args} />
        </div>
    ),
};

export const Welcome: Story = {
    args: {
        variant: 'welcome',
        action: {
            label: 'Get Started',
            onClick: () => alert('Get Started clicked'),
        },
    },
    render: (args) => (
        <div className="w-[350px] bg-card border border-border rounded-lg">
            <EmptyState {...args} />
        </div>
    ),
};

export const Error: Story = {
    args: {
        variant: 'error',
        action: {
            label: 'Try Again',
            onClick: () => alert('Try Again clicked'),
        },
    },
    render: (args) => (
        <div className="w-[350px] bg-card border border-border rounded-lg">
            <EmptyState {...args} />
        </div>
    ),
};

export const Custom: Story = {
    args: {
        variant: 'custom',
        icon: Inbox,
        title: 'Inbox Zero!',
        description: 'You have no pending notifications. Enjoy the peace.',
    },
    render: (args) => (
        <div className="w-[350px] bg-card border border-border rounded-lg">
            <EmptyState {...args} />
        </div>
    ),
};

export const WithActions: Story = {
    args: {
        variant: 'no-collections',
        action: {
            label: 'Create Collection',
            onClick: () => alert('Create clicked'),
        },
        secondaryAction: {
            label: 'Learn More',
            onClick: () => alert('Learn More clicked'),
        },
    },
    render: (args) => (
        <div className="w-[350px] bg-card border border-border rounded-lg">
            <EmptyState {...args} />
        </div>
    ),
};

export const Sizes: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="w-[300px] bg-card border border-border rounded-lg">
                <EmptyState variant="no-highlights" size="sm" />
            </div>
            <div className="w-[350px] bg-card border border-border rounded-lg">
                <EmptyState variant="no-highlights" size="md" />
            </div>
            <div className="w-[400px] bg-card border border-border rounded-lg">
                <EmptyState variant="no-highlights" size="lg" />
            </div>
        </div>
    ),
};
