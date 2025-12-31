/**
 * @file e2e-fixtures.ts
 * @description Playwright fixtures for E2E testing
 * 
 * Provides helpers for loading extension and testing in browser
 */

import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * Extended test with extension context
 */
export const test = base.extend<{
    context: BrowserContext;
    extensionId: string;
}>({
    // Load extension before each test
    context: async ({ }, use) => {
        const pathToExtension = path.join(__dirname, '../../.output/chrome-mv3');
        const context = await chromium.launchPersistentContext('', {
            headless: false,
            args: [
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`,
            ],
        });
        await use(context);
        await context.close();
    },

    // Get extension ID
    extensionId: async ({ context }, use) => {
        let [background] = context.serviceWorkers();
        if (!background) background = await context.waitForEvent('serviceworker');

        const extensionId = background.url().split('/')[2];
        await use(extensionId);
    },
});

export { expect } from '@playwright/test';
