import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { UserMenu } from './UserMenu';

/**
 * User Menu Component
 * 
 * **Design Reference**: `/docs/07-design/account menu/account-menu-screen.png`
 * 
 * Dropdown menu for user account actions (theme switching, logout)
 */
const meta = {
    title: 'Components/UserMenu',
    component: UserMenu,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        user: {
            name: 'John Doe',
            email: 'john@example.com',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        },
        onLogout: () => console.log('Logout clicked'),
        onThemeChange: (theme: string) => console.log('Theme changed to:', theme),
    },
};

export const WithoutAvatar: Story = {
    args: {
        user: {
            name: 'Jane Smith',
            email: 'jane@example.com',
        },
        onLogout: () => console.log('Logout'),
        onThemeChange: (theme: string) => console.log('Theme:', theme),
    },
};
