import type { Config } from 'tailwindcss';

export default {
    content: [
        './src/**/*.{html,js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            // Material Design 3 Typography Scale
            fontSize: {
                // Display
                'display-large': ['57px', { lineHeight: '64px', letterSpacing: '-0.25px', fontWeight: '400' }],
                'display-medium': ['45px', { lineHeight: '52px', letterSpacing: '0', fontWeight: '400' }],
                'display-small': ['36px', { lineHeight: '44px', letterSpacing: '0', fontWeight: '400' }],

                // Headline
                'headline-large': ['32px', { lineHeight: '40px', letterSpacing: '0', fontWeight: '400' }],
                'headline-medium': ['28px', { lineHeight: '36px', letterSpacing: '0', fontWeight: '400' }],
                'headline-small': ['24px', { lineHeight: '32px', letterSpacing: '0', fontWeight: '400' }],

                // Title
                'title-large': ['22px', { lineHeight: '28px', letterSpacing: '0', fontWeight: '400' }],
                'title-medium': ['16px', { lineHeight: '24px', letterSpacing: '0.15px', fontWeight: '500' }],
                'title-small': ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],

                // Body
                'body-large': ['16px', { lineHeight: '24px', letterSpacing: '0.5px', fontWeight: '400' }],
                'body-medium': ['14px', { lineHeight: '20px', letterSpacing: '0.25px', fontWeight: '400' }],
                'body-small': ['12px', { lineHeight: '16px', letterSpacing: '0.4px', fontWeight: '400' }],

                // Label
                'label-large': ['14px', { lineHeight: '20px', letterSpacing: '0.1px', fontWeight: '500' }],
                'label-medium': ['12px', { lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' }],
                'label-small': ['11px', { lineHeight: '16px', letterSpacing: '0.5px', fontWeight: '500' }],
            },

            // Material Design 3 Font Family
            fontFamily: {
                'sans': ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
            },

            // Material Design 3 Colors
            colors: {
                // Primary
                primary: {
                    DEFAULT: '#5b8db9', // Your blue (acceptable in MD3)
                    container: '#d1e4f3',
                },

                // Surface Container System (Light Mode)
                'surface-container-lowest-light': '#FFFFFF',
                'surface-container-low-light': '#F7F2FA',
                'surface-container-light': '#F3EDF7',
                'surface-container-high-light': '#ECE6F0',
                'surface-container-highest-light': '#E6E0E9',

                // Surface Container System (Dark Mode)
                'surface-container-lowest-dark': '#0F0D13',
                'surface-container-low-dark': '#1D1B20',
                'surface-container-dark': '#211F26',
                'surface-container-high-dark': '#2B2930',
                'surface-container-highest-dark': '#36343B',

                // Surface
                'surface-light': '#FEF7FF',
                'surface-dark': '#1C1B1F',

                // On Surface
                'on-surface-light': '#1C1B1F',
                'on-surface-dark': '#E6E1E5',

                // On Surface Variant
                'on-surface-variant-light': '#49454F',
                'on-surface-variant-dark': '#CAC4D0',

                // Outline
                'outline-light': '#79747E',
                'outline-dark': '#938F99',

                // Outline Variant
                'outline-variant-light': '#CAC4D0',
                'outline-variant-dark': '#49454F',
            },

            // Material Design 3 Spacing (4dp base)
            spacing: {
                '1': '4px',
                '2': '8px',
                '3': '12px',
                '4': '16px',
                '5': '20px',
                '6': '24px',
                '7': '28px',
                '8': '32px',
                '9': '36px',
                '10': '40px',
                '11': '44px',
                '12': '48px',
                '14': '56px',
                '16': '64px',
            },

            // Material Design 3 Border Radius
            borderRadius: {
                'none': '0',
                'xs': '4px',
                'sm': '8px',
                'md': '12px',
                'lg': '16px',
                'xl': '20px',
                '2xl': '28px',
                'full': '9999px',
            },

            // Material Design 3 Elevation (Shadows)
            boxShadow: {
                'elevation-1': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
                'elevation-2': '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
                'elevation-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3)',
                'elevation-4': '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.3)',
                'elevation-5': '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px rgba(0, 0, 0, 0.3)',
            },
        },
    },
    plugins: [],
} satisfies Config;
