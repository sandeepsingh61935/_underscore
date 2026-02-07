import type { Meta, StoryObj } from '@storybook/react';
import { UserMenu } from './UserMenu';
import { MemoryRouter } from 'react-router-dom';

const meta: Meta<typeof UserMenu> = {
    title: 'UI System/Composed/UserMenu',
    component: UserMenu,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    decorators: [
        (Story) => (
            <MemoryRouter>
                <div className="p-8">
                    <Story />
                </div>
            </MemoryRouter>
        ),
    ],
    argTypes: {
        onLogout: { action: 'logout' },
        onThemeChange: { action: 'theme changed' },
        onSettings: { action: 'settings clicked' },
    },
};

export default meta;
type Story = StoryObj<typeof UserMenu>;

const mockUser = {
    id: '1',
    email: 'john.doe@example.com',
    displayName: 'John Doe',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
};

const mockUserNoPhoto = {
    id: '2',
    email: 'jane.smith@example.com',
    displayName: 'Jane Smith',
};

export const WithPhoto: Story = {
    args: {
        user: mockUser,
        currentTheme: 'light',
    },
};

export const WithInitials: Story = {
    args: {
        user: mockUserNoPhoto,
        currentTheme: 'dark',
    },
};

export const DarkTheme: Story = {
    args: {
        user: mockUser,
        currentTheme: 'dark',
    },
    decorators: [
        (Story) => (
            <div className="dark bg-background p-8 rounded-lg">
                <Story />
            </div>
        ),
    ],
};
