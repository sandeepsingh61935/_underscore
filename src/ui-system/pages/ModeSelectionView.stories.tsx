import type { Meta, StoryObj } from '@storybook/react';
import { ModeSelectionPage } from './ModeSelectionView';

const meta: Meta<typeof ModeSelectionPage> = {
    title: 'UI System/Pages/ModeSelectionPage',
    component: ModeSelectionPage,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
    argTypes: {
        onModeSelect: { action: 'mode selected' },
        onSignInClick: { action: 'sign in clicked' },
    },
};

export default meta;
type Story = StoryObj<typeof ModeSelectionPage>;

export const Unauthenticated: Story = {
    args: {
        selectedMode: 'focus',
        isAuthenticated: false,
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <ModeSelectionPage {...args} />
        </div>
    )
};

export const Authenticated: Story = {
    args: {
        selectedMode: 'focus',
        isAuthenticated: true,
    },
    render: (args) => (
        <div className="w-[400px] h-[600px] border shadow-xl bg-background">
            <ModeSelectionPage {...args} />
        </div>
    )
};
