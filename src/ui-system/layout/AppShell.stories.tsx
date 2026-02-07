import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from './AppShell';
import { MemoryRouter } from 'react-router-dom';
import { PopupAppProvider } from '../../../core/context/PopupAppProvider';

const meta: Meta<typeof AppShell> = {
    title: 'UI System/Layout/AppShell',
    component: AppShell,
    decorators: [
        (Story) => (
            <MemoryRouter>
                <PopupAppProvider>
                    <Story />
                </PopupAppProvider>
            </MemoryRouter>
        ),
    ],
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
    args: {
        children: (
            <div className="space-y-4">
                <div className="p-4 bg-surface-container rounded-md">
                    <h3 className="text-title-medium font-medium mb-2">Content Area</h3>
                    <p className="text-body text-on-surface-variant">
                        This area scrolls automatically while the header stays fixed.
                    </p>
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 bg-surface-container-low rounded-md">
                        <p>Scrollable item {i + 1}</p>
                    </div>
                ))}
            </div>
        ),
    },
};

export const NoHeader: Story = {
    args: {
        showHeader: false,
        children: (
            <div className="h-full flex items-center justify-center bg-surface-container">
                <p>Full height content without header</p>
            </div>
        ),
    },
};

export const NoPadding: Story = {
    args: {
        noPadding: true,
        children: (
            <div className="grid grid-cols-2 gap-px bg-outline-variant">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-surface flex items-center justify-center">
                        Tile {i + 1}
                    </div>
                ))}
            </div>
        ),
    },
};
