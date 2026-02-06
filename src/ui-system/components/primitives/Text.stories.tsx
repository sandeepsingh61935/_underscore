import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Text } from './Text';

/**
 * Text Component
 * 
 * Semantic text component using MD3 typography scale
 */
const meta = {
    title: 'UI/Primitives/Text',
    component: Text,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypographyScale: Story = {
    render: () => (
        <div className="space-y-4 p-4">
            <div>
                <Text variant="display-large">Display Large</Text>
                <p className="text-label-small text-on-surface-variant">57px / 64px / 400</p>
            </div>
            <div>
                <Text variant="headline-large">Headline Large</Text>
                <p className="text-label-small text-on-surface-variant">32px / 40px / 400</p>
            </div>
            <div>
                <Text variant="title-large">Title Large</Text>
                <p className="text-label-small text-on-surface-variant">22px / 28px / 400</p>
            </div>
            <div>
                <Text variant="body-large">Body Large - Lorem ipsum dolor sit amet</Text>
                <p className="text-label-small text-on-surface-variant">16px / 24px / 400</p>
            </div>
            <div>
                <Text variant="label-large">Label Large</Text>
                <p className="text-label-small text-on-surface-variant">14px / 20px / 500</p>
            </div>
        </div>
    ),
};
