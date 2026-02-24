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
import { PopupRouter, Route, Switch, useRouter, useNavigate } from '../../ui-system/router/PopupRouter';

describe('ThemeProvider', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('light', 'dark', 'sepia');
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
            return <button onClick={() => setTheme('sepia')}>Set Sepia</button>;
        }

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        fireEvent.click(screen.getByText('Set Sepia'));

        await waitFor(() => {
            expect(localStorage.getItem('underscore-theme-preference')).toBe('sepia');
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
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
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
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
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
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('status').textContent).toBe('authenticated');
            expect(screen.getByTestId('email').textContent).toBe('test@example.com');
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
