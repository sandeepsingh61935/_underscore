import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Button component
 * 
 * Tests all button variants and states against baseline snapshots
 */
test.describe('Button Component', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('filled variant matches baseline', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-button--filled');
        await page.waitForSelector('#storybook-root button');
        await expect(page.locator('#storybook-root')).toHaveScreenshot('button-filled.png');
    });

    test('disabled state has correct opacity', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-button--filled-disabled');
        const button = page.locator('button[disabled]').first();

        // Verify MD3 spec: 38% opacity
        await page.waitForSelector('button[disabled]');
        const opacity = await button.evaluate((el) => window.getComputedStyle(el).opacity);
        expect(parseFloat(opacity)).toBeCloseTo(0.38, 2);

        await expect(page.locator('#storybook-root')).toHaveScreenshot('button-disabled.png');
    });

    test('all states screenshot', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-button--all-states');
        await page.waitForSelector('button');
        await expect(page).toHaveScreenshot('button-all-states.png', { fullPage: true });
    });

    test('hover state shows elevation', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-button--filled');
        const button = page.locator('button').first();

        // Hover and capture
        await button.hover();
        await expect(page.locator('#storybook-root')).toHaveScreenshot('button-hover.png');
    });
});

test.describe('Card Component', () => {
    test('default card matches baseline', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-card--default');
        await page.waitForSelector('#storybook-root');
        await expect(page.locator('#storybook-root')).toHaveScreenshot('card-default.png');
    });

    test('interactive card hover shows elevation change', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-card--interactive');
        const card = page.locator('button').first();

        // Default state
        await expect(page.locator('#storybook-root')).toHaveScreenshot('card-interactive-default.png');

        // Hover state
        await card.hover();
        await expect(page.locator('#storybook-root')).toHaveScreenshot('card-interactive-hover.png');
    });

    test('collections grid layout', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-card--collections-grid');
        await page.waitForSelector('#storybook-root');
        await expect(page).toHaveScreenshot('card-collections-grid.png', { fullPage: true });
    });
});

test.describe('Sign In View', () => {
    test('matches design mockup', async ({ page }) => {
        await page.goto('/?path=/story/views-signinview--default');
        await page.waitForSelector('button');

        // Full page screenshot to compare with design
        await expect(page).toHaveScreenshot('signin-view-default.png', { fullPage: true });
    });

    test('disabled providers have correct styling', async ({ page }) => {
        await page.goto('/?path=/story/views-signinview--with-disabled-providers');
        await page.waitForSelector('button[disabled]');

        const disabledButtons = page.locator('button[disabled]');
        const count = await disabledButtons.count();
        expect(count).toBe(3); // Apple, X, Facebook

        // Verify each disabled button has 38% opacity
        for (let i = 0; i < count; i++) {
            const opacity = await disabledButtons.nth(i).evaluate((el) =>
                window.getComputedStyle(el).opacity
            );
            expect(parseFloat(opacity)).toBeCloseTo(0.38, 2);
        }

        await expect(page).toHaveScreenshot('signin-view-disabled.png', { fullPage: true });
    });
});

test.describe('Collections View', () => {
    test('grid view matches design', async ({ page }) => {
        await page.goto('/?path=/story/views-collectionsview--grid-view');
        await page.waitForSelector('#storybook-root');
        await expect(page).toHaveScreenshot('collections-grid.png', { fullPage: true });
    });
});

test.describe('Mode Selection View', () => {
    test('matches design mockup', async ({ page }) => {
        await page.goto('/?path=/story/views-modeselectionview--default');
        await page.waitForSelector('button');
        await expect(page).toHaveScreenshot('mode-selection-default.png', { fullPage: true });
    });
});

test.describe('Dark Mode', () => {
    test('button in dark mode', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-button--filled&globals=backgrounds.value:#111418');
        await page.waitForSelector('button');
        await expect(page.locator('#storybook-root')).toHaveScreenshot('button-filled-dark.png');
    });

    test('card in dark mode', async ({ page }) => {
        await page.goto('/?path=/story/ui-primitives-card--default&globals=backgrounds.value:#111418');
        await page.waitForSelector('#storybook-root');
        await expect(page.locator('#storybook-root')).toHaveScreenshot('card-default-dark.png');
    });
});
