import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    // Test directory
    testDir: './tests/e2e',

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
    reporter: [
        ['html'],
        ['list'],
        ['json', { outputFile: 'test-results/results.json' }],
    ],

    // Shared settings for all the projects below
    use: {
        // Base URL for navigation
        baseURL: 'https://example.com',

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'retain-on-failure',

        // Browser context options
        viewport: { width: 1280, height: 720 },

        // Emulate browser locale
        locale: 'en-US',

        // Emulate timezone
        timezoneId: 'America/New_York',
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        // Uncomment to test on Firefox and WebKit
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
    ],

    // Run your local dev server before starting the tests (if needed)
    // webServer: {
    //   command: 'npm run dev',
    //   port: 3000,
    //   reuseExistingServer: !process.env.CI,
    // },
});
