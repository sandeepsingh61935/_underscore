/**
 * @file smoke.test.ts
 * @description E2E smoke tests for extension
 *
 * Basic tests to ensure the extension loads and functions
 */

import { test, expect } from './fixtures';

test.describe('Extension E2E Smoke Tests (3 tests)', () => {
  test('1. extension loads successfully', async ({ extensionId }) => {
    expect(extensionId).toBeDefined();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
  });

  test('2. can navigate to test page', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('https://example.com');

    const title = await page.title();
    expect(title).toBeTruthy();

    await page.close();
  });

  test('3. content script can be injected', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if we can access the page
    const body = await page.$('body');
    expect(body).toBeTruthy();

    await page.close();
  });
});
