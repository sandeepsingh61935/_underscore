import type { Preview } from '@storybook/react';
import '../src/ui-system/theme/global.css';

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
    // Wrap all stories in #app div to apply MD3 styles correctly
    decorators: [
        (Story, context) => {
            // Apply dark mode class based on background selection
            const isDark = context.globals.backgrounds?.value === '#111418';

            return (
                <div id="app" className={isDark ? 'dark' : ''}>
                    <Story />
                </div>
            );
        },
    ],
};

export default preview;
