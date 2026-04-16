import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { SegmentedControl } from './SegmentedControl';

const meta: Meta<typeof SegmentedControl> = {
  title: 'Primitives/SegmentedControl',
  component: SegmentedControl,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {
  render: () => {
    const [val, setVal] = React.useState('system');
    return (
      <div style={{ width: 280 }}>
        <SegmentedControl
          options={['system', 'light', 'dark']}
          value={val}
          onChange={setVal}
          layoutId="story-default"
        />
      </div>
    );
  },
};

export const ModeColors: Story = {
  render: () => {
    const [val, setVal] = React.useState('Focus');
    return (
      <div style={{ width: 360 }}>
        <SegmentedControl
          options={['Focus', 'Capture', 'Memory', 'Neural']}
          value={val}
          onChange={setVal}
          layoutId="story-mode"
          modeColors
        />
      </div>
    );
  },
};
