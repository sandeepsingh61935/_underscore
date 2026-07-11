import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignInView } from '../SignInView';
import * as AppProvider from '../../../core/context/AppProvider';

vi.mock('../../../core/context/AppProvider', () => ({
    useApp: vi.fn(),
}));

vi.mock('@/shared/auth/session-bridge', () => ({
    syncSessionToExtension: vi.fn().mockResolvedValue(undefined),
}));

const mockSupabase = {
    auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
            data: {
                user: { id: 'test-user-id', email: 'test@example.com' },
                session: {
                    access_token: 'access',
                    refresh_token: 'refresh',
                    user: { id: 'test-user-id', email: 'test@example.com' },
                },
            },
            error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
            data: {
                user: { id: 'test-user-id', email: 'test@example.com' },
                session: {
                    access_token: 'access',
                    refresh_token: 'refresh',
                    user: { id: 'test-user-id', email: 'test@example.com' },
                },
            },
            error: null,
        }),
        signInWithOAuth: vi.fn().mockResolvedValue({
            data: { url: 'https://google.com' },
            error: null,
        }),
    },
};

vi.mock('@/shared/auth/supabase-web-client', () => ({
    getWebSupabaseClient: vi.fn(() => mockSupabase),
}));

const mockLogin = vi.fn();
const mockSetIsLoading = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('SignInView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (AppProvider.useApp as ReturnType<typeof vi.fn>).mockReturnValue({
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

        expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    });

    it('submits form and calls login', async () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

        expect(mockSetIsLoading).toHaveBeenCalledWith(true);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalled();
            expect(mockSetIsLoading).toHaveBeenCalledWith(false);
        });
    });

    it('does not call login before OAuth redirect completes', async () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

        expect(mockSetIsLoading).toHaveBeenCalledWith(true);
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalled();
        expect(mockLogin).not.toHaveBeenCalled();
    });
});
