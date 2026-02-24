import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
    Skeleton,
    SkeletonText,
    SkeletonAvatar,
    SkeletonCollectionCard,
    SkeletonHighlightCard,
    SkeletonCollectionsList,
    SkeletonHighlightsList,
} from './Skeleton';

const meta: Meta<typeof Skeleton> = {
    title: 'UI System/Primitives/Skeleton',
    component: Skeleton,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Base: Story = {
    render: () => (
        <div className="w-[300px] space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
    ),
};

export const Text: Story = {
    render: () => (
        <div className="w-[300px] space-y-6">
            <div>
                <p className="text-sm text-muted-foreground mb-2">Single line</p>
                <SkeletonText lines={1} />
            </div>
            <div>
                <p className="text-sm text-muted-foreground mb-2">Multiple lines</p>
                <SkeletonText lines={3} />
            </div>
        </div>
    ),
};

export const Avatar: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <SkeletonAvatar size="sm" />
            <SkeletonAvatar size="md" />
            <SkeletonAvatar size="lg" />
        </div>
    ),
};

export const CollectionCard: Story = {
    render: () => (
        <div className="w-[350px]">
            <SkeletonCollectionCard />
        </div>
    ),
};

export const HighlightCard: Story = {
    render: () => (
        <div className="w-[400px]">
            <SkeletonHighlightCard />
        </div>
    ),
};

export const CollectionsList: Story = {
    render: () => (
        <div className="w-[350px]">
            <SkeletonCollectionsList count={4} />
        </div>
    ),
};

export const HighlightsList: Story = {
    render: () => (
        <div className="w-[400px]">
            <SkeletonHighlightsList count={3} />
        </div>
    ),
};

export const Combined: Story = {
    render: () => (
        <div className="w-[350px] p-4 bg-background border border-border rounded-lg space-y-4">
            {/* Header skeleton */}
            <div className="flex items-center gap-3">
                <SkeletonAvatar size="md" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>

            {/* Content skeleton */}
            <SkeletonText lines={2} />

            {/* Cards skeleton */}
            <SkeletonCollectionsList count={2} />
        </div>
    ),
};
