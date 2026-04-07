import type { Config } from 'tailwindcss';

export default {
    content: [
        './src/**/*.{html,js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            // ===== Material Design 3 Colors (All 46 tokens) =====
            colors: {
                // Primary family
                'primary': 'var(--md-sys-color-primary)',
                'on-primary': 'var(--md-sys-color-on-primary)',
                'primary-container': 'var(--md-sys-color-primary-container)',
                'on-primary-container': 'var(--md-sys-color-on-primary-container)',
                'primary-fixed': 'var(--md-sys-color-primary-fixed)',
                'on-primary-fixed': 'var(--md-sys-color-on-primary-fixed)',
                'primary-fixed-dim': 'var(--md-sys-color-primary-fixed-dim)',
                'on-primary-fixed-variant': 'var(--md-sys-color-on-primary-fixed-variant)',

                // Secondary family
                'secondary': 'var(--md-sys-color-secondary)',
                'on-secondary': 'var(--md-sys-color-on-secondary)',
                'secondary-container': 'var(--md-sys-color-secondary-container)',
                'on-secondary-container': 'var(--md-sys-color-on-secondary-container)',
                'secondary-fixed': 'var(--md-sys-color-secondary-fixed)',
                'on-secondary-fixed': 'var(--md-sys-color-on-secondary-fixed)',
                'secondary-fixed-dim': 'var(--md-sys-color-secondary-fixed-dim)',
                'on-secondary-fixed-variant': 'var(--md-sys-color-on-secondary-fixed-variant)',

                // Tertiary family
                'tertiary': 'var(--md-sys-color-tertiary)',
                'on-tertiary': 'var(--md-sys-color-on-tertiary)',
                'tertiary-container': 'var(--md-sys-color-tertiary-container)',
                'on-tertiary-container': 'var(--md-sys-color-on-tertiary-container)',
                'tertiary-fixed': 'var(--md-sys-color-tertiary-fixed)',
                'on-tertiary-fixed': 'var(--md-sys-color-on-tertiary-fixed)',
                'tertiary-fixed-dim': 'var(--md-sys-color-tertiary-fixed-dim)',
                'on-tertiary-fixed-variant': 'var(--md-sys-color-on-tertiary-fixed-variant)',

                // Error family
                'error': 'var(--md-sys-color-error)',
                'on-error': 'var(--md-sys-color-on-error)',
                'error-container': 'var(--md-sys-color-error-container)',
                'on-error-container': 'var(--md-sys-color-on-error-container)',

                // Surface & background
                'surface-dim': 'var(--md-sys-color-surface-dim)',
                'surface': 'var(--md-sys-color-surface)',
                'surface-bright': 'var(--md-sys-color-surface-bright)',
                'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest)',
                'surface-container-low': 'var(--md-sys-color-surface-container-low)',
                'surface-container': 'var(--md-sys-color-surface-container)',
                'surface-container-high': 'var(--md-sys-color-surface-container-high)',
                'surface-container-highest': 'var(--md-sys-color-surface-container-highest)',
                'on-surface': 'var(--md-sys-color-on-surface)',
                'on-surface-variant': 'var(--md-sys-color-on-surface-variant)',

                // Inverse
                'inverse-surface': 'var(--md-sys-color-inverse-surface)',
                'inverse-on-surface': 'var(--md-sys-color-inverse-on-surface)',
                'inverse-primary': 'var(--md-sys-color-inverse-primary)',

                // Outline
                'outline': 'var(--md-sys-color-outline)',
                'outline-variant': 'var(--md-sys-color-outline-variant)',

                // Special
                'scrim': 'var(--md-sys-color-scrim)',
                'shadow': 'var(--md-sys-color-shadow)',

                // Ink & Glass surface layers
                'ink-1':         'var(--ink-1)',
                'ink-2':         'var(--ink-2)',
                'ink-3':         'var(--ink-3)',
                'ink-4':         'var(--ink-4)',

                // Ink borders
                'ink-border':    'var(--ink-border)',
                'ink-border-hi': 'var(--ink-border-hi)',

                // Ink text
                'ink-text':      'var(--ink-text)',
                'ink-text-m':    'var(--ink-text-m)',
                'ink-text-f':    'var(--ink-text-f)',

                // Mode inks
                'ink-focus':     'var(--ink-focus)',
                'ink-capture':   'var(--ink-capture)',
                'ink-memory':    'var(--ink-memory)',
                'ink-neural':    'var(--ink-neural)',
                'ink-mode':      'var(--ink-mode)',

            },

            // ===== Material Design 3 Typography Scale =====
            fontSize: {
                // Display
                'display-large': ['var(--md-sys-typescale-display-large-size)', {
                    lineHeight: 'var(--md-sys-typescale-display-large-line-height)',
                    fontWeight: 'var(--md-sys-typescale-display-large-weight)'
                }],
                'display-medium': ['var(--md-sys-typescale-display-medium-size)', {
                    lineHeight: 'var(--md-sys-typescale-display-medium-line-height)',
                    fontWeight: 'var(--md-sys-typescale-display-medium-weight)'
                }],
                'display-small': ['var(--md-sys-typescale-display-small-size)', {
                    lineHeight: 'var(--md-sys-typescale-display-small-line-height)',
                    fontWeight: 'var(--md-sys-typescale-display-small-weight)'
                }],

                // Headline
                'headline-large': ['var(--md-sys-typescale-headline-large-size)', {
                    lineHeight: 'var(--md-sys-typescale-headline-large-line-height)',
                    fontWeight: 'var(--md-sys-typescale-headline-large-weight)'
                }],
                'headline-medium': ['var(--md-sys-typescale-headline-medium-size)', {
                    lineHeight: 'var(--md-sys-typescale-headline-medium-line-height)',
                    fontWeight: 'var(--md-sys-typescale-headline-medium-weight)'
                }],
                'headline-small': ['var(--md-sys-typescale-headline-small-size)', {
                    lineHeight: 'var(--md-sys-typescale-headline-small-line-height)',
                    fontWeight: 'var(--md-sys-typescale-headline-small-weight)'
                }],

                // Title
                'title-large': ['var(--md-sys-typescale-title-large-size)', {
                    lineHeight: 'var(--md-sys-typescale-title-large-line-height)',
                    fontWeight: 'var(--md-sys-typescale-title-large-weight)'
                }],
                'title-medium': ['var(--md-sys-typescale-title-medium-size)', {
                    lineHeight: 'var(--md-sys-typescale-title-medium-line-height)',
                    fontWeight: 'var(--md-sys-typescale-title-medium-weight)'
                }],
                'title-small': ['var(--md-sys-typescale-title-small-size)', {
                    lineHeight: 'var(--md-sys-typescale-title-small-line-height)',
                    fontWeight: 'var(--md-sys-typescale-title-small-weight)'
                }],

                // Body
                'body-large': ['var(--md-sys-typescale-body-large-size)', {
                    lineHeight: 'var(--md-sys-typescale-body-large-line-height)',
                    fontWeight: 'var(--md-sys-typescale-body-large-weight)'
                }],
                'body-medium': ['var(--md-sys-typescale-body-medium-size)', {
                    lineHeight: 'var(--md-sys-typescale-body-medium-line-height)',
                    fontWeight: 'var(--md-sys-typescale-body-medium-weight)'
                }],
                'body-small': ['var(--md-sys-typescale-body-small-size)', {
                    lineHeight: 'var(--md-sys-typescale-body-small-line-height)',
                    fontWeight: 'var(--md-sys-typescale-body-small-weight)'
                }],

                // Label
                'label-large': ['var(--md-sys-typescale-label-large-size)', {
                    lineHeight: 'var(--md-sys-typescale-label-large-line-height)',
                    fontWeight: 'var(--md-sys-typescale-label-large-weight)'
                }],
                'label-medium': ['var(--md-sys-typescale-label-medium-size)', {
                    lineHeight: 'var(--md-sys-typescale-label-medium-line-height)',
                    fontWeight: 'var(--md-sys-typescale-label-medium-weight)'
                }],
                'label-small': ['var(--md-sys-typescale-label-small-size)', {
                    lineHeight: 'var(--md-sys-typescale-label-small-line-height)',
                    fontWeight: 'var(--md-sys-typescale-label-small-weight)'
                }],
            },

            // ===== Font Family =====
            fontFamily: {
                'sans':    ['var(--font-body)', '-apple-system', 'sans-serif'],
                'display': ['var(--font-display)', 'serif'],
                'mono':    ['var(--font-mono)', 'monospace'],
            },

            // ===== Material Design 3 Shape (Border Radius) =====
            borderRadius: {
                'none': 'var(--md-sys-shape-corner-none)',
                'xs': 'var(--md-sys-shape-corner-extra-small)',    // 4px
                'sm': 'var(--md-sys-shape-corner-small)',          // 8px
                'md': 'var(--md-sys-shape-corner-medium)',         // 12px
                'lg': 'var(--md-sys-shape-corner-large)',          // 16px
                'xl': 'var(--md-sys-shape-corner-extra-large)',    // 28px
                'full': 'var(--md-sys-shape-corner-full)',         // 9999px
            },

            // ===== Material Design 3 Motion (Transitions) =====
            transitionTimingFunction: {
                'standard': 'var(--md-sys-motion-easing-standard)',
                'emphasized': 'var(--md-sys-motion-easing-emphasized)',
                'decelerate': 'var(--md-sys-motion-easing-decelerate)',
                'accelerate': 'var(--md-sys-motion-easing-accelerate)',
                'spring': 'cubic-bezier(0.34, 1.3, 0.64, 1)',
                'ease-out-smooth': 'cubic-bezier(0.22, 1.00, 0.36, 1)',
            },

            transitionDuration: {
                'short': 'var(--md-sys-motion-duration-short)',      // 200ms
                'medium': 'var(--md-sys-motion-duration-medium)',    // 300ms
                'long': 'var(--md-sys-motion-duration-long)',        // 500ms
            },

            // ===== Material Design 3 Spacing (4dp base) =====
            spacing: {
                '0.5': '2px',
                '1': '4px',
                '1.5': '6px',
                '2': '8px',
                '2.5': '10px',
                '3': '12px',
                '3.5': '14px',
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
                '20': '80px',
                '24': '96px',
            },

            // ===== Material Design 3 Elevation (Shadows) =====
            boxShadow: {
                'elevation-0': 'none',
                'elevation-1': '0 1px 4px rgba(0,0,0,0.40)',
                'elevation-2': '0 4px 16px rgba(0,0,0,0.45)',
                'elevation-3': '0 8px 32px rgba(0,0,0,0.50)',
                'elevation-4': '0px 6px 10px 4px rgba(0, 0, 0, 0.15), 0px 2px 3px rgba(0, 0, 0, 0.3)',
                'elevation-5': '0px 8px 12px 6px rgba(0, 0, 0, 0.15), 0px 4px 4px rgba(0, 0, 0, 0.3)',
                'elevation-mode': '0 4px 24px color-mix(in srgb, var(--ink-mode) 35%, transparent)',
            },

            // ===== MD3 Opacity Tokens =====
            opacity: {
                'disabled': '0.38',  // MD3 spec for disabled states
                '38': '0.38',        // Shorthand for disabled opacity
                'hover': '0.08',     // MD3 state layer hover
                'focus': '0.12',     // MD3 state layer focus/press
                'drag': '0.16',      // MD3 state layer drag
            },
        },
    },
    plugins: [],
} satisfies Config;
