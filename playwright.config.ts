import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E and Visual Regression tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directories
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],

  // Maximum time one test can run
  timeout: 30000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [['html'], ['list'], ['json', { outputFile: 'test-results/results.json' }]],

  // Shared settings for all the projects below
  use: {
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    // Visual regression tests (Storybook)
    {
      name: 'visual',
      testMatch: '**/visual/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:6006',
      },
    },

    // E2E tests (example.com)
    {
      name: 'e2e',
      testMatch: '**/e2e/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://example.com',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      },
    },
  ],

  // Run Storybook before visual tests
  webServer: {
    command: 'npm run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: true, // Use existing Storybook instance
    timeout: 120000,
  },
});
