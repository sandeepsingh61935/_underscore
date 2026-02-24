import type { Preview } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import '../src/ui-system/theme/global.css';

// Mock Chrome API for Storybook environment
if (typeof window !== 'undefined' && typeof (window as any).chrome === 'undefined') {
    (window as any).chrome = {
        runtime: {
            sendMessage: async (message: any) => {
                console.log('[Mock Chrome] sendMessage:', message);
                // Return mock responses based on message type
                if (message.type === 'GET_AUTH_STATE') {
                    return { success: false, data: null };
                }
                if (message.type === 'LOGIN') {
                    return {
                        success: true,
                        data: {
                            user: {
                                id: 'mock-user-id',
                                email: 'demo@example.com',
                                displayName: 'Demo User',
                            }
                        }
                    };
                }
                if (message.type === 'LOGOUT') {
                    return { success: true };
                }
                return { success: false, error: 'Unknown message type' };
            },
            onMessage: {
                addListener: (callback: any) => {
                    console.log('[Mock Chrome] onMessage.addListener registered');
                },
                removeListener: (callback: any) => {
                    console.log('[Mock Chrome] onMessage.removeListener');
                },
            },
            id: 'mock-extension-id',
        },
        storage: {
            local: {
                get: async (keys: string[]) => ({}),
                set: async (items: any) => { },
            },
        },
    };
}

const preview: Preview = {
    parameters: {
        // MD3 background colors for light/dark modes
        backgrounds: {
            default: 'light',
            values: [
                {
                    name: 'light',
                    value: '#f9f9ff', // MD3 surface (light mode)
                },
                {
                    name: 'dark',
                    value: '#111418', // MD3 surface (dark mode)
                },
            ],
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        // Accessibility addon configuration
        a11y: {
            element: '#storybook-root',
            config: {
                rules: [
                    {
                        // Disable color-contrast rule for now (we'll fix incrementally)
                        id: 'color-contrast',
                        enabled: true,
                    },
                ],
            },
        },
    },
    // Wrap all stories in MemoryRouter and #app div
    decorators: [
        (Story, context) => {
            // Apply dark mode class based on background selection
            const isDark = context.globals.backgrounds?.value === '#111418';

            return (
                <MemoryRouter>
                    <div id="app" className={isDark ? 'dark' : ''}>
                        <Story />
                    </div>
                </MemoryRouter>
            );
        },
    ],
};

export default preview;
