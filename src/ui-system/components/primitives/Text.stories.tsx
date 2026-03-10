import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Text, type TextVariant } from './Text';

const meta = {
  title: 'UI/Primitives/Text',
  component: Text,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

const typographySamples: Array<{
  label: string;
  meta: string;
  variant: TextVariant;
  className?: string;
}> = [
  { label: 'Display Large', meta: '57px / 64px / 400', variant: 'displayLarge' },
  { label: 'Display Small', meta: '36px / 44px / 400', variant: 'displaySmall' },
  { label: 'Headline Large', meta: '32px / 40px / 400', variant: 'headlineLarge' },
  { label: 'Headline Medium', meta: '28px / 36px / 400', variant: 'headlineMedium' },
  { label: 'Headline Small', meta: '24px / 32px / 400', variant: 'headlineSmall' },
  { label: 'Title Large', meta: '22px / 28px / 400', variant: 'titleLarge' },
  { label: 'Title Medium', meta: '16px / 24px / 500', variant: 'titleMedium' },
  { label: 'Title Small', meta: '14px / 20px / 500', variant: 'titleSmall' },
  { label: 'Body Large', meta: '16px / 24px / 400', variant: 'bodyLarge' },
  { label: 'Body Medium', meta: '14px / 20px / 400', variant: 'bodyMedium' },
  { label: 'Body Small', meta: '12px / 16px / 400', variant: 'bodySmall' },
  { label: 'Label Large', meta: '14px / 20px / 500', variant: 'labelLarge' },
  { label: 'Label Medium', meta: '12px / 16px / 500', variant: 'labelMedium' },
  { label: 'Label Small', meta: '11px / 16px / 500', variant: 'labelSmall' },
  {
    label: 'Overline',
    meta: 'Label Small + uppercase tracking',
    variant: 'labelSmall',
    className: 'uppercase tracking-[0.15em] text-outline',
  },
];

export const TypographyScale: Story = {
  render: () => (
    <div className="max-w-[520px] space-y-5 p-4">
      {typographySamples.map((sample) => (
        <div key={sample.label}>
          <Text variant={sample.variant} className={sample.className}>
            {sample.label}
          </Text>
          <p className="text-label-small text-on-surface-variant">{sample.meta}</p>
        </div>
      ))}
      <div>
        <Text variant="link">Interactive Link</Text>
        <p className="text-label-small text-on-surface-variant">
          Uses the project label-medium link treatment
        </p>
      </div>
    </div>
  ),
};
