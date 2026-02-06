import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/**/*.mdx',
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-essentials',  // Essential addons (docs, controls, etc.)
    '@storybook/addon-interactions', // Interaction testing
    '@storybook/addon-a11y',        // Accessibility testing
    '@chromatic-com/storybook',     // Visual regression
  ],
  framework: '@storybook/react-vite',
  docs: {
    autodocs: 'tag',  // Auto-generate docs for tagged stories
  },
};

export default config;