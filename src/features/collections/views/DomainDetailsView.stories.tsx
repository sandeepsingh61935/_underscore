import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DomainDetailsView } from '@/ui-system/pages/DomainDetailsView';
import type { Highlight } from '@/ui-system/components/composed/HighlightCard';

/**
 * Domain Details View
 * 
 * **Design Reference**: 
 * - Light mode: `/docs/07-design/domain underscore details dashbaord/light mode/light-mode-code-screen.png`
 * - Dark mode: `/docs/07-design/domain underscore details dashbaord/Dark mode/dark-mode-image.png`
 * - Sepia mode: `/docs/07-design/domain underscore details dashbaord/sepia mode/sepia mode-image.png`
 * 
 * Shows detailed view of underscores for a specific domain.
 * 
 * Note: This story uses the presentational DomainDetailsView from ui-system/pages.
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

const mockHighlights: Highlight[] = [
    {
        id: '1',
        text: 'The key to successful software development is understanding that code is written for humans first, machines second.',
        color: '#8b5cf6',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        urlPath: '/blog/software-development-tips',
    },
    {
        id: '2',
        text: 'Always write tests before implementation. This ensures your code meets specifications and helps catch regressions early.',
        color: '#22c55e',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        urlPath: '/docs/testing-guide',
    },
    {
        id: '3',
        text: 'Design patterns are not rules to follow blindly. They are tools to help solve common problems.',
        color: '#f59e0b',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        urlPath: '/patterns/overview',
    },
];

/**
 * Default domain details view
 */
export const Default: Story = {
    args: {
        domain: 'github.com',
        favicon: 'https://github.com/favicon.ico',
        highlights: mockHighlights,
        onBack: () => console.log('Back to collections'),
        onHighlightCopy: (text) => console.log('Copy:', text.substring(0, 30) + '...'),
        onHighlightDelete: (id) => console.log('Delete:', id),
        onHighlightNavigate: (path) => console.log('Navigate:', path),
        onExportAll: () => console.log('Export all'),
        onClearAll: () => console.log('Clear all'),
        onVisitDomain: () => console.log('Visit domain'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background p-4">
            <DomainDetailsView {...args} />
        </div>
    ),
};

/**
 * Empty state (no highlights)
 */
export const Empty: Story = {
    args: {
        domain: 'example.com',
        highlights: [],
        onBack: () => console.log('Back'),
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background p-4">
            <DomainDetailsView {...args} />
        </div>
    ),
};

/**
 * Light mode
 */
export const LightMode: Story = {
    args: {
        domain: 'github.com',
        favicon: 'https://github.com/favicon.ico',
        highlights: mockHighlights,
        onBack: () => console.log('Back'),
        onExportAll: () => console.log('Export'),
    },
    parameters: {
        backgrounds: { default: 'light' },
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background p-4">
            <DomainDetailsView {...args} />
        </div>
    ),
};

/**
 * Dark mode
 */
export const DarkMode: Story = {
    args: {
        domain: 'github.com',
        favicon: 'https://github.com/favicon.ico',
        highlights: mockHighlights,
        onBack: () => console.log('Back'),
        onExportAll: () => console.log('Export'),
    },
    parameters: {
        backgrounds: { default: 'dark' },
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background dark p-4">
            <DomainDetailsView {...args} />
        </div>
    ),
};
