import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SignInView } from '../SignInView';
import * as AppProvider from '../../../core/context/AppProvider';
import { stashIntendedMode } from '@/shared/auth/pending-intent';
import { isAuthEmailUiEnabled } from '@/shared/auth/auth-email-ui';

vi.mock('../../../core/context/AppProvider', () => ({
    useApp: vi.fn(),
}));

vi.mock('@/shared/auth/session-bridge', () => ({
    syncSessionToExtension: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/auth/pending-intent', () => ({
    stashIntendedMode: vi.fn(),
}));

vi.mock('@/shared/auth/auth-email-ui', () => ({
    isAuthEmailUiEnabled: vi.fn(() => false),
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
        vi.mocked(isAuthEmailUiEnabled).mockReturnValue(false);
        (AppProvider.useApp as ReturnType<typeof vi.fn>).mockReturnValue({
            login: mockLogin,
            setIsLoading: mockSetIsLoading,
            isLoading: false,
        });
    });

    it('default: Google-only landing (no email form)', () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        expect(screen.getByTestId('auth-landing-chrome')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
        expect(screen.queryByTestId('auth-email-form')).toBeNull();
        expect(screen.queryByLabelText('Email')).toBeNull();
        expect(screen.queryByText('or email')).toBeNull();
        expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
        expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    });

    it('navigates to /settings on Back when there is no same-origin history', () => {
        render(
            <MemoryRouter>
                <SignInView />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Back to settings' }));
        expect(mockNavigate).toHaveBeenCalledWith('/settings');
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

    describe('when VITE_AUTH_EMAIL_UI is enabled', () => {
        beforeEach(() => {
            vi.mocked(isAuthEmailUiEnabled).mockReturnValue(true);
        });

        it('renders email form elements', () => {
            render(
                <MemoryRouter>
                    <SignInView />
                </MemoryRouter>
            );

            expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
            expect(screen.getByTestId('auth-email-form')).toBeInTheDocument();
            expect(screen.getByLabelText('Email')).toBeInTheDocument();
            expect(screen.getByLabelText('Password')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
            expect(screen.getByText('or email')).toBeInTheDocument();
        });

        it('puts Google before the email form', () => {
            render(
                <MemoryRouter>
                    <SignInView />
                </MemoryRouter>
            );

            const google = screen.getByRole('button', { name: 'Continue with Google' });
            const submit = screen.getByRole('button', { name: 'Create account' });
            expect(google.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        });

        it('shows welcome-back copy when toggled to sign-in', () => {
            render(
                <MemoryRouter>
                    <SignInView />
                </MemoryRouter>
            );

            fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
            expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
            expect(screen.getByText('Open your synced collections.')).toBeInTheDocument();
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

        it('navigates to /verify-email without logging in when signUp returns no session', async () => {
            mockSupabase.auth.signUp.mockResolvedValueOnce({
                data: { user: { id: 'test-user-id', email: 'new@example.com' }, session: null },
                error: null,
            });

            window.history.pushState({}, '', '/sign-in?intendedMode=pro');

            render(
                <MemoryRouter>
                    <SignInView />
                </MemoryRouter>
            );

            fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith(
                    expect.stringContaining('/verify-email?email=new%40example.com')
                );
            });

            expect(stashIntendedMode).toHaveBeenCalledWith('pro');
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('shows a sign-in nudge when the account already exists', async () => {
            mockSupabase.auth.signUp.mockResolvedValueOnce({
                data: {
                    user: { id: 'existing-id', email: 'existing@example.com', identities: [] },
                    session: null,
                },
                error: null,
            });

            render(
                <MemoryRouter>
                    <SignInView />
                </MemoryRouter>
            );

            fireEvent.change(screen.getByLabelText('Email'), {
                target: { value: 'existing@example.com' },
            });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
            fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

            await waitFor(() => {
                expect(
                    screen.getByText('An account with this email already exists. Sign in instead.')
                ).toBeInTheDocument();
            });

            expect(mockNavigate).not.toHaveBeenCalled();
            expect(mockLogin).not.toHaveBeenCalled();
            expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
        });

        it('rejects passwords under 8 characters before calling Supabase', async () => {
            render(
                <MemoryRouter>
                    <SignInView />
                </MemoryRouter>
            );

            fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
            fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short1' } });
            fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

            await waitFor(() => {
                expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
            });
            expect(mockSupabase.auth.signUp).not.toHaveBeenCalled();
        });
    });
});
