import type { Meta, StoryObj } from '@storybook/react';
import { ModeCard } from './ModeCard';
import { Zap, Archive, Brain, Footprints } from 'lucide-react';

const meta: Meta<typeof ModeCard> = {
    title: 'UI System/Composed/ModeCard',
    component: ModeCard,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        onClick: { action: 'clicked' },
    },
};

export default meta;
type Story = StoryObj<typeof ModeCard>;

export const Default: Story = {
    args: {
        id: 'focus',
        label: 'Focus Mode',
        description: 'Capture content without distractions.',
        icon: <Footprints className="w-5 h-5" />,
    },
};

export const Active: Story = {
    args: {
        ...Default.args,
        isActive: true,
    },
};

export const Locked: Story = {
    args: {
        id: 'neural',
        label: 'Neural Mode',
        description: 'AI-powered organization and connecting of ideas.',
        icon: <Brain className="w-5 h-5" />,
        isLocked: true,
    },
};

export const GridExample: Story = {
    render: () => (
        <div className="grid grid-cols-1 gap-4 w-[380px]">
            <ModeCard
                id="walk"
                label="Walk"
                description="Casual browsing with manual highlighting."
                icon={<Footprints className="w-5 h-5" />}
                isActive={true}
            />
            <ModeCard
                id="sprint"
                label="Sprint"
                description="High-speed capture session."
                icon={<Zap className="w-5 h-5" />}
            />
            <ModeCard
                id="vault"
                label="Vault"
                description="Secure storage for sensitive clips."
                icon={<Archive className="w-5 h-5" />}
                isLocked={true}
            />
        </div>
    ),
};
