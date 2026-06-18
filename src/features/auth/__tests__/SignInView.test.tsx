import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignInView } from '../SignInView';
import * as AppProvider from '../../../core/context/AppProvider';

// Mock the AppProvider hook
vi.mock('../../../core/context/AppProvider', () => ({
    useApp: vi.fn(),
}));

const mockSupabase = {
    auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id', email: 'test@example.com' } },
            error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
            data: { user: { id: 'test-user-id', email: 'test@example.com' } },
            error: null,
        }),
        signInWithOAuth: vi.fn().mockResolvedValue({
            data: { url: 'https://google.com' },
            error: null,
        }),
    },
};

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase),
}));

const mockLogin = vi.fn();
const mockSetIsLoading = vi.fn();

describe('SignInView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (AppProvider.useApp as any).mockReturnValue({
            login: mockLogin,
            setIsLoading: mockSetIsLoading,
            isLoading: false,
        });
    });

    it('renders the sign-in form elements', () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        // Header
        expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();

        // Inputs
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();

        // Buttons
        expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    });

    it('toggles between sign-in and sign-up modes', () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        // Initial state is sign-up
        expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();

        // Click toggle
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

        // Now in sign-in mode
        expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();

        // Click toggle again
        fireEvent.click(screen.getByRole('button', { name: 'Create one' }));
        expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    });

    it('submits form and calls login', async () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        // Fill form
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

        // Submit
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

        expect(mockSetIsLoading).toHaveBeenCalledWith(true);

        // Login takes 1.5s in the mock, wait for it
        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalled();
            expect(mockSetIsLoading).toHaveBeenCalledWith(false);
        }, { timeout: 2000 });
    });

    it('calls login for Google auth', async () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

        expect(mockSetIsLoading).toHaveBeenCalledWith(true);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalled();
            expect(mockSetIsLoading).toHaveBeenCalledWith(false);
        }, { timeout: 2000 });
    });
});
