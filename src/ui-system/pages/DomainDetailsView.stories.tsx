import type { Meta, StoryObj } from '@storybook/react';
import { DomainDetailsView } from './DomainDetailsView';
import type { Highlight } from '../components/composed/HighlightCard';

const meta: Meta<typeof DomainDetailsView> = {
    title: 'UI System/Pages/DomainDetailsView',
    component: DomainDetailsView,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
        onBack: { action: 'back clicked' },
        onHighlightCopy: { action: 'highlight copied' },
        onHighlightDelete: { action: 'highlight deleted' },
        onExportAll: { action: 'export all clicked' },
        onClearAll: { action: 'clear all clicked' },
        onVisitDomain: { action: 'visit domain clicked' },
    },
};

export default meta;
type Story = StoryObj<typeof DomainDetailsView>;

const mockHighlights: Highlight[] = [
    {
        id: '1',
        text: 'React makes it painless to create interactive UIs. Design simple views for each state in your application.',
        urlPath: '/docs/getting-started',
        createdAt: new Date(),
        colorRole: 'yellow',
    },
    {
        id: '2',
        text: 'Declarative views make your code more predictable and easier to debug.',
        urlPath: '/docs/declarative',
        createdAt: new Date(Date.now() - 86400000),
        colorRole: 'blue',
    },
    {
        id: '3',
        text: 'Build encapsulated components that manage their own state, then compose them to make complex UIs.',
        urlPath: '/docs/components',
        createdAt: new Date(Date.now() - 172800000),
        colorRole: 'purple',
    },
    {
        id: '4',
        text: 'Since component logic is written in JavaScript instead of templates, you can easily pass rich data through your app.',
        urlPath: '/docs/data-flow',
        createdAt: new Date(Date.now() - 259200000),
        colorRole: 'green',
    },
];

export const Default: Story = {
    args: {
        domain: 'reactjs.org',
        favicon: 'https://reactjs.org/favicon.ico',
        highlights: mockHighlights,
    },
    render: (args) => (
        <div className="w-[400px] h-[550px] p-4 bg-background">
            <DomainDetailsView {...args} />
        </div>
    ),
};

export const NoFavicon: Story = {
    args: {
        domain: 'example.com',
        highlights: mockHighlights.slice(0, 2),
    },
    render: (args) => (
        <div className="w-[400px] h-[550px] p-4 bg-background">
            <DomainDetailsView {...args} />
        </div>
    ),
};

export const Empty: Story = {
    args: {
        domain: 'newsite.com',
        highlights: [],
    },
    render: (args) => (
        <div className="w-[400px] h-[550px] p-4 bg-background">
            <DomainDetailsView {...args} />
        </div>
    ),
};

export const SingleHighlight: Story = {
    args: {
        domain: 'blog.example.com',
        favicon: 'https://github.com/favicon.ico',
        highlights: [mockHighlights[0]],
    },
    render: (args) => (
        <div className="w-[400px] h-[550px] p-4 bg-background">
            <DomainDetailsView {...args} />
        </div>
    ),
};
