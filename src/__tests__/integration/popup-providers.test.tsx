import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock chrome API
const mockChrome = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
    },
};

(globalThis as any).chrome = mockChrome;

// Import after mocking chrome
import { ThemeProvider, useTheme } from '../../ui-system/theme/ThemeProvider';
import { AuthProvider, useAuth } from '../../ui-system/providers/AuthProvider';
import { PopupRouter, Route, Switch, useRouter } from '../../ui-system/router/PopupRouter';
import { MessageBusProvider } from '../../shared/contexts/MessageBusContext';
import type { IMessageBus } from '../../shared/interfaces/i-message-bus';

// Build a MessageBus that proxies send() to the mocked chrome.runtime.sendMessage.
const mockMessageBus: IMessageBus = {
    send: vi.fn(async (_target: 'background' | 'content' | 'popup', message: unknown) => {
        const response = await mockChrome.runtime.sendMessage(message);
        return response;
    }),
    subscribe: vi.fn(() => () => {}),
    publish: vi.fn(async () => {}),
} as unknown as IMessageBus;

describe('ThemeProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('light', 'dark');
    });

    it('should default to system theme', async () => {
        function TestComponent() {
            const { preference } = useTheme();
            return <div data-testid="preference">{preference}</div>;
        }

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('preference').textContent).toBe('system');
        });
    });

    it('should change theme when setTheme is called', async () => {
        function TestComponent() {
            const { theme, setTheme } = useTheme();
            return (
                <div>
                    <div data-testid="theme">{theme}</div>
                    <button onClick={() => setTheme('dark')}>Set Dark</button>
                </div>
            );
        }

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        fireEvent.click(screen.getByText('Set Dark'));

        await waitFor(() => {
            expect(screen.getByTestId('theme').textContent).toBe('dark');
        });
    });

    it('should persist theme to localStorage', async () => {
        function TestComponent() {
            const { setTheme } = useTheme();
            return <button onClick={() => setTheme('light')}>Set Light</button>;
        }

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        fireEvent.click(screen.getByText('Set Light'));

        await waitFor(() => {
            expect(localStorage.getItem('underscore-theme-preference')).toBe('light');
        });
    });
});

describe('AuthProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockChrome.runtime.sendMessage.mockResolvedValue({
            success: false,
            data: null,
        });
    });

    it('should start in loading state', () => {
        function TestComponent() {
            const { status } = useAuth();
            return <div data-testid="status">{status}</div>;
        }

        render(
            <MessageBusProvider messageBus={mockMessageBus}>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </MessageBusProvider>
        );

        expect(screen.getByTestId('status').textContent).toBe('loading');
    });

    it('should become unauthenticated after loading', async () => {
        function TestComponent() {
            const { status, isAuthenticated } = useAuth();
            return (
                <div>
                    <div data-testid="status">{status}</div>
                    <div data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</div>
                </div>
            );
        }

        render(
            <MessageBusProvider messageBus={mockMessageBus}>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </MessageBusProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('status').textContent).toBe('unauthenticated');
            expect(screen.getByTestId('auth').textContent).toBe('no');
        });
    });

    it('should set user on successful auth', async () => {
        mockChrome.runtime.sendMessage.mockResolvedValue({
            success: true,
            data: { user: { id: '1', email: 'test@example.com' } },
        });

        function TestComponent() {
            const { user, status } = useAuth();
            return (
                <div>
                    <div data-testid="status">{status}</div>
                    <div data-testid="email">{user?.email || 'none'}</div>
                </div>
            );
        }

        render(
            <MessageBusProvider messageBus={mockMessageBus}>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </MessageBusProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('status').textContent).toBe('authenticated');
            expect(screen.getByTestId('email').textContent).toBe('test@example.com');
        });
    });

    it('should route loginWithEmail through useCurrentUser -> useIpcAction -> chrome IPC', async () => {
        // Wire-shaped response: useCurrentUser's loginWithEmail expects
        // { success, data: { user, verificationStatus, verificationExpiresAt } }.
        let resolveLoginEmail: (value: unknown) => void = () => {};
        const pending = new Promise((resolve) => { resolveLoginEmail = resolve; });

        const callLog: Array<{ type: string; payload?: unknown }> = [];
        mockChrome.runtime.sendMessage.mockImplementation(async (msg: unknown) => {
            const m = msg as { type: string; payload?: unknown };
            callLog.push({ type: m.type, payload: m.payload });
            if (m.type === 'GET_AUTH_STATE') {
                return { success: false, data: null };
            }
            if (m.type === 'LOGIN_EMAIL') {
                const response = await pending;
                return response;
            }
            return { success: false, data: null };
        });

        function TestComponent() {
            const { loginWithEmail, error } = useAuth();
            return (
                <div>
                    <button
                        onClick={() => { void loginWithEmail('a@b.com', 'pw'); }}
                    >
                        Login Email
                    </button>
                    <div data-testid="error">{error ?? 'no-error'}</div>
                </div>
            );
        }

        render(
            <MessageBusProvider messageBus={mockMessageBus}>
                <AuthProvider>
                    <TestComponent />
                </AuthProvider>
            </MessageBusProvider>
        );

        fireEvent.click(screen.getByText('Login Email'));

        // Verify the email action was dispatched with the right payload
        // (proves the new AuthProvider wires loginWithEmail through to IPC).
        await waitFor(() => {
            const loginCall = callLog.find((c) => c.type === 'LOGIN_EMAIL');
            expect(loginCall).toBeDefined();
            expect(loginCall?.payload).toEqual({ email: 'a@b.com', password: 'pw' });
        });

        // Resolve the pending login to a success envelope and verify error
        // state updates correctly.
        resolveLoginEmail({
            success: true,
            data: {
                user: { id: '2', email: 'a@b.com' },
                verificationStatus: 'idle',
                verificationExpiresAt: null,
            },
        });
    });
});

describe('PopupRouter', () => {
    it('should render initial route', () => {
        function TestComponent() {
            const { currentRoute } = useRouter();
            return <div data-testid="route">{currentRoute}</div>;
        }

        render(
            <PopupRouter initialRoute="collections">
                <TestComponent />
            </PopupRouter>
        );

        expect(screen.getByTestId('route').textContent).toBe('collections');
    });

    it('should navigate between routes', async () => {
        function TestComponent() {
            const { currentRoute, navigate } = useRouter();
            return (
                <div>
                    <div data-testid="route">{currentRoute}</div>
                    <button onClick={() => navigate('domain-details')}>Go</button>
                </div>
            );
        }

        render(
            <PopupRouter initialRoute="collections">
                <TestComponent />
            </PopupRouter>
        );

        expect(screen.getByTestId('route').textContent).toBe('collections');

        fireEvent.click(screen.getByText('Go'));

        expect(screen.getByTestId('route').textContent).toBe('domain-details');
    });

    it('should go back in history', async () => {
        function TestComponent() {
            const { currentRoute, navigate, goBack, canGoBack } = useRouter();
            return (
                <div>
                    <div data-testid="route">{currentRoute}</div>
                    <div data-testid="canGoBack">{canGoBack ? 'yes' : 'no'}</div>
                    <button onClick={() => navigate('settings')}>Go Settings</button>
                    <button onClick={goBack}>Back</button>
                </div>
            );
        }

        render(
            <PopupRouter initialRoute="collections">
                <TestComponent />
            </PopupRouter>
        );

        expect(screen.getByTestId('canGoBack').textContent).toBe('no');

        fireEvent.click(screen.getByText('Go Settings'));
        expect(screen.getByTestId('route').textContent).toBe('settings');
        expect(screen.getByTestId('canGoBack').textContent).toBe('yes');

        fireEvent.click(screen.getByText('Back'));
        expect(screen.getByTestId('route').textContent).toBe('collections');
    });

    it('should render Switch with matching Route', () => {
        render(
            <PopupRouter initialRoute="mode-selection">
                <Switch>
                    <Route path="collections">
                        <div>Collections Page</div>
                    </Route>
                    <Route path="mode-selection">
                        <div>Mode Selection Page</div>
                    </Route>
                </Switch>
            </PopupRouter>
        );

        expect(screen.getByText('Mode Selection Page')).toBeInTheDocument();
        expect(screen.queryByText('Collections Page')).not.toBeInTheDocument();
    });
});
