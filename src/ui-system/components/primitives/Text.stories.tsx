import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Text } from './Text';

const meta = {
    title: 'UI/Primitives/Text',
    component: Text,
    parameters: { layout: 'centered' },
    tags: ['autodocs'],
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypographyScale: Story = {
    render: () => (
        <div className="space-y-4 p-4">
            <div>
                <Text variant="h1">Headline Large (32px)</Text>
                <p className="text-label-small text-on-surface-variant">32px / 40px / 400</p>
            </div>
            <div>
                <Text variant="h2">Headline Medium (28px)</Text>
                <p className="text-label-small text-on-surface-variant">28px / 36px / 400</p>
            </div>
            <div>
                <Text variant="h3">Title Large (22px)</Text>
                <p className="text-label-small text-on-surface-variant">22px / 28px / 400</p>
            </div>
            <div>
                <Text variant="body">Body Large — Lorem ipsum dolor sit amet</Text>
                <p className="text-label-small text-on-surface-variant">16px / 24px / 400</p>
            </div>
            <div>
                <Text variant="small">Body Medium — Supporting text</Text>
                <p className="text-label-small text-on-surface-variant">14px / 20px / 400</p>
            </div>
            <div>
                <Text variant="label">Label Medium</Text>
                <p className="text-label-small text-on-surface-variant">12px / 16px / 500</p>
            </div>
            <div>
                <Text variant="link">Interactive Link</Text>
                <p className="text-label-small text-on-surface-variant">Clickable</p>
            </div>
        </div>
    ),
};
