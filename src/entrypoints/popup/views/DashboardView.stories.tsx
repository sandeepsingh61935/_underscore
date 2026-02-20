import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { Text } from '@/ui-system/components/primitives/Text';
import { UserMenu } from '@/ui-system/components/composed/UserMenu';
import { ModeSelector } from '@/ui-system/components/composed/ModeSelector';
import { CollectionCard } from '@/ui-system/components/composed/CollectionCard';

/**
 * Dashboard View
 * 
 * Main extension popup view with header and navigation.
 * 
 * **Note**: This story uses presentational components directly since
 * the full DashboardView requires Chrome extension APIs.
 */
const meta = {
    title: 'Views/DashboardView',
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const mockUser = {
    id: 'mock-user-id',
    email: 'demo@example.com',
    displayName: 'Demo User',
    photoUrl: 'https://ui-avatars.com/api/?name=Demo+User&background=6366f1&color=fff',
};

const mockCollections = [
    { domain: 'github.com', category: 'Development', count: 24 },
    { domain: 'medium.com', category: 'Reading', count: 18 },
    { domain: 'docs.google.com', category: 'Work', count: 12 },
];

/**
 * Presentational version of the dashboard
 */
export const Default: Story = {
    render: () => (
        <div className="w-[400px] h-[600px] flex flex-col bg-surface border shadow-xl">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-outline bg-surface-container/80 backdrop-blur-md sticky top-0 z-10">
                <Logo className="scale-75 origin-left" showText={true} />
                <UserMenu
                    user={mockUser}
                    onLogout={() => console.log('Logout')}
                />
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                {/* Mode Selection Section */}
                <section className="space-y-3">
                    <Text variant="small" muted className="uppercase tracking-wider font-semibold ml-1">
                        Active Mode
                    </Text>
                    <ModeSelector
                        currentModeId="focus"
                        onSelect={(modeId) => console.log('Selected mode:', modeId)}
                        isAuthenticated={true}
                    />
                </section>

                {/* Collections Section */}
                <section className="space-y-3 pb-8">
                    <div className="flex items-center justify-between ml-1">
                        <Text variant="small" muted className="uppercase tracking-wider font-semibold">
                            Collections
                        </Text>
                        <button className="text-primary text-xs font-medium hover:underline">
                            View All
                        </button>
                    </div>

                    <div className="space-y-2">
                        {mockCollections.map((collection) => (
                            <CollectionCard
                                key={collection.domain}
                                domain={collection.domain}
                                category={collection.category}
                                count={collection.count}
                                onClick={() => console.log('Clicked:', collection.domain)}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    ),
};

/**
 * Unauthenticated state
 */
export const Unauthenticated: Story = {
    render: () => (
        <div className="w-[400px] h-[600px] flex flex-col bg-surface border shadow-xl">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-outline bg-surface-container/80 backdrop-blur-md sticky top-0 z-10">
                <Logo className="scale-75 origin-left" showText={true} />
                <button className="text-sm text-primary font-medium">Sign In</button>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                {/* Mode Selection Section */}
                <section className="space-y-3">
                    <Text variant="small" muted className="uppercase tracking-wider font-semibold ml-1">
                        Active Mode
                    </Text>
                    <ModeSelector
                        currentModeId="focus"
                        onSelect={(modeId) => console.log('Selected mode:', modeId)}
                        isAuthenticated={false}
                    />
                </section>

                {/* Empty state */}
                <section className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <Text variant="body" muted className="mb-4">Sign in to sync your highlights</Text>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                        Get Started
                    </button>
                </section>
            </div>
        </div>
    ),
};
