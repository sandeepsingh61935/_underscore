import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { DashboardView } from './DashboardView';

/**
 * Dashboard View
 * 
 * Main extension popup view with header and navigation
 */
const meta = {
    title: 'Views/DashboardView',
    component: DashboardView,
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
} satisfies Meta<typeof DashboardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithUserMenu: Story = {
    render: () => (
        <div className="w-[360px] h-[600px]">
            <DashboardView />
        </div>
    ),
};
