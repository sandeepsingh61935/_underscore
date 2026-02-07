import type { Meta, StoryObj } from '@storybook/react';
import { CollectionsView, Collection } from './CollectionsView';

const meta: Meta<typeof CollectionsView> = {
    title: 'UI System/Pages/CollectionsView',
    component: CollectionsView,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
        onCollectionClick: { action: 'collection clicked' },
        onAddNew: { action: 'add new clicked' },
    },
};

export default meta;
type Story = StoryObj<typeof CollectionsView>;

const mockCollections: Collection[] = [
    {
        id: '1',
        domain: 'github.com',
        category: 'Development',
        favicon: 'https://github.com/favicon.ico',
        count: 24,
        lastAccessed: new Date(),
    },
    {
        id: '2',
        domain: 'developer.mozilla.org',
        category: 'Documentation',
        favicon: 'https://developer.mozilla.org/favicon.ico',
        count: 156,
        lastAccessed: new Date(Date.now() - 86400000),
    },
    {
        id: '3',
        domain: 'stackoverflow.com',
        category: 'Q&A',
        favicon: 'https://stackoverflow.com/favicon.ico',
        count: 89,
        lastAccessed: new Date(Date.now() - 172800000),
    },
    {
        id: '4',
        domain: 'medium.com',
        category: 'Articles',
        count: 42,
        lastAccessed: new Date(Date.now() - 259200000),
    },
    {
        id: '5',
        domain: 'reactjs.org',
        category: 'Documentation',
        favicon: 'https://reactjs.org/favicon.ico',
        count: 31,
        lastAccessed: new Date(Date.now() - 345600000),
    },
];

export const Default: Story = {
    args: {
        collections: mockCollections,
    },
    render: (args) => (
        <div className="w-[400px] h-[500px] p-4 bg-background">
            <CollectionsView {...args} />
        </div>
    ),
};

export const Empty: Story = {
    args: {
        collections: [],
    },
    render: (args) => (
        <div className="w-[400px] h-[500px] p-4 bg-background">
            <CollectionsView {...args} />
        </div>
    ),
};

export const FewCollections: Story = {
    args: {
        collections: mockCollections.slice(0, 2),
    },
    render: (args) => (
        <div className="w-[400px] h-[500px] p-4 bg-background">
            <CollectionsView {...args} />
        </div>
    ),
};
