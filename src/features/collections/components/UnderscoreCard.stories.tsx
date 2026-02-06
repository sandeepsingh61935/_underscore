import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { UnderscoreCard } from './UnderscoreCard';

/**
 * Underscore Card Component
 * 
 * **Design Reference**: `/docs/07-design/domain underscore details dashbaord/`
 * 
 * Individual underscore item in domain details view
 */
const meta = {
    title: 'Components/UnderscoreCard',
    component: UnderscoreCard,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof UnderscoreCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        text: 'The minimalist design movement originated in the 20th century as a reaction against the complexity and ornamentation of previous art styles.',
        timestamp: new Date().toISOString(),
        onCopy: () => console.log('Copied'),
        onDelete: () => console.log('Deleted'),
    },
};

export const ShortText: Story = {
    args: {
        text: 'Material Design 3 is based on HCT color system.',
        timestamp: new Date().toISOString(),
        onCopy: () => { },
        onDelete: () => { },
    },
};

export const Multiple: Story = {
    render: () => (
        <div className="flex flex-col gap-3 w-[320px] p-4">
            <UnderscoreCard
                text="First underscore with longer text content that spans multiple lines to show how the card handles wrapping."
                timestamp={new Date().toISOString()}
                onCopy={() => { }}
                onDelete={() => { }}
            />
            <UnderscoreCard
                text="Second underscore - shorter content"
                timestamp={new Date().toISOString()}
                onCopy={() => { }}
                onDelete={() => { }}
            />
            <UnderscoreCard
                text="Third underscore for testing card layout"
                timestamp={new Date().toISOString()}
                onCopy={() => { }}
                onDelete={() => { }}
            />
        </div>
    ),
};
