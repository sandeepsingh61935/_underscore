/**
 * @file e2e-fixtures.ts
 * @description Playwright fixtures for E2E testing
 * 
 * Provides helpers for loading extension and testing in browser
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { test as base, chromium, type BrowserContext } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extended test with extension context
 */
export const test = base.extend<{
    context: BrowserContext;
    extensionId: string;
}>({
    // Load extension before each test
    context: async (_args, use) => {
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
        if (!extensionId) {
            throw new Error('Could not determine extension ID from background service worker');
        }
        await use(extensionId);
    },
});

export { expect } from '@playwright/test';
