import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserMenu } from '../UserMenu';
import type { User } from '../hooks/useCurrentUser';

const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    displayName: 'Test User',
    provider: 'google',
    photoUrl: 'https://example.com/avatar.png',
};

describe('UserMenu', () => {
    it('renders the user avatar', () => {
        render(<UserMenu user={mockUser} onLogout={() => {}} />);
        const avatar = screen.getByAltText('Test User');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.png');
    });

    it('renders initial if avatar is not provided', () => {
        const userWithoutAvatar = { ...mockUser, photoUrl: undefined };
        render(<UserMenu user={userWithoutAvatar} onLogout={() => {}} />);
        expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('toggles the dropdown menu on button click', () => {
        render(<UserMenu user={mockUser} onLogout={() => {}} />);

        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();

        const button = screen.getByRole('button', { name: `Open user menu for ${mockUser.displayName}` });
        fireEvent.click(button);

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();

        fireEvent.click(button);
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
    });

    it('triggers onLogout callback when Sign Out is clicked', () => {
        const onLogout = vi.fn();
        render(<UserMenu user={mockUser} onLogout={onLogout} />);

        fireEvent.click(screen.getByRole('button', { name: `Open user menu for ${mockUser.displayName}` }));
        fireEvent.click(screen.getByText('Sign Out'));
        expect(onLogout).toHaveBeenCalledOnce();
    });
});
