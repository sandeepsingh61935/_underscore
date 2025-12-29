/**
 * @file color-manager.test.ts
 * @description Unit tests for ColorManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ColorManager, COLOR_PALETTE, type ColorName } from '@/content/color-manager';

// Mock chrome.storage API
const mockStorage = {
    local: {
        get: vi.fn(),
        set: vi.fn(),
    },
};

vi.stubGlobal('chrome', { storage: mockStorage });

describe('ColorManager', () => {
    let colorManager: ColorManager;

    beforeEach(() => {
        colorManager = new ColorManager();
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with default color when no saved color', async () => {
            mockStorage.local.get.mockResolvedValue({});

            await colorManager.initialize();
            const color = await colorManager.getCurrentColor();

            expect(color).toBe(COLOR_PALETTE.yellow);
            expect(colorManager.isInitialized()).toBe(true);
        });

        it('should load saved color from storage', async () => {
            mockStorage.local.get.mockResolvedValue({
                currentHighlightColor: COLOR_PALETTE.blue,
            });

            await colorManager.initialize();
            const color = await colorManager.getCurrentColor();

            expect(color).toBe(COLOR_PALETTE.blue);
        });

        it('should use default color if saved color is invalid', async () => {
            mockStorage.local.get.mockResolvedValue({
                currentHighlightColor: 'invalid-color',
            });

            await colorManager.initialize();
            const color = await colorManager.getCurrentColor();

            expect(color).toBe(COLOR_PALETTE.yellow);
        });

        it('should not initialize twice', async () => {
            mockStorage.local.get.mockResolvedValue({});

            await colorManager.initialize();
            await colorManager.initialize(); // Second call

            expect(mockStorage.local.get).toHaveBeenCalledTimes(1);
        });

        it('should handle storage errors gracefully', async () => {
            mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

            await colorManager.initialize();
            const color = await colorManager.getCurrentColor();

            expect(color).toBe(COLOR_PALETTE.yellow); // Falls back to default
            expect(colorManager.isInitialized()).toBe(true);
        });
    });

    describe('getCurrentColor', () => {
        it('should return current color', async () => {
            mockStorage.local.get.mockResolvedValue({});

            const color = await colorManager.getCurrentColor();

            expect(color).toBe(COLOR_PALETTE.yellow);
        });

        it('should auto-initialize if not initialized', async () => {
            mockStorage.local.get.mockResolvedValue({});

            expect(colorManager.isInitialized()).toBe(false);

            await colorManager.getCurrentColor();

            expect(colorManager.isInitialized()).toBe(true);
        });
    });

    describe('setCurrentColor', () => {
        beforeEach(async () => {
            mockStorage.local.get.mockResolvedValue({});
            mockStorage.local.set.mockResolvedValue(undefined);
            await colorManager.initialize();
        });

        it('should set color from palette', async () => {
            await colorManager.setCurrentColor(COLOR_PALETTE.green);
            const color = await colorManager.getCurrentColor();

            expect(color).toBe(COLOR_PALETTE.green);
            expect(mockStorage.local.set).toHaveBeenCalledWith({
                currentHighlightColor: COLOR_PALETTE.green,
            });
        });

        it('should accept valid hex color', async () => {
            const customColor = '#FF0000';
            await colorManager.setCurrentColor(customColor);
            const color = await colorManager.getCurrentColor();

            expect(color).toBe(customColor);
        });

        it('should reject invalid hex color', async () => {
            await expect(colorManager.setCurrentColor('invalid')).rejects.toThrow('Invalid color');
            await expect(colorManager.setCurrentColor('#FFF')).rejects.toThrow(); // Too short
        });

        it('should continue if storage.set fails', async () => {
            mockStorage.local.set.mockRejectedValue(new Error('Storage error'));

            await colorManager.setCurrentColor(COLOR_PALETTE.purple);
            const color = await colorManager.getCurrentColor();

            expect(color).toBe(COLOR_PALETTE.purple); // Color changed in memory
        });
    });

    describe('getColorPalette', () => {
        it('should return all palette colors', () => {
            const palette = colorManager.getColorPalette();

            expect(palette).toEqual(COLOR_PALETTE);
            expect(Object.keys(palette)).toHaveLength(5);
        });

        it('should return a copy of the palette', () => {
            const palette1 = colorManager.getColorPalette();
            const palette2 = colorManager.getColorPalette();

            expect(palette1).not.toBe(palette2); // Different objects
            expect(palette1).toEqual(palette2); // Same values
        });
    });

    describe('getDefaultColor', () => {
        it('should return yellow as default', () => {
            const defaultColor = colorManager.getDefaultColor();
            expect(defaultColor).toBe(COLOR_PALETTE.yellow);
        });
    });

    describe('getColorName', () => {
        it('should return color name for palette color', () => {
            expect(colorManager.getColorName(COLOR_PALETTE.yellow)).toBe('yellow');
            expect(colorManager.getColorName(COLOR_PALETTE.blue)).toBe('blue');
            expect(colorManager.getColorName(COLOR_PALETTE.green)).toBe('green');
        });

        it('should be case-insensitive', () => {
            expect(colorManager.getColorName('#FFEB3B')).toBe('yellow');
            expect(colorManager.getColorName('#ffeb3b')).toBe('yellow');
        });

        it('should return null for non-palette color', () => {
            expect(colorManager.getColorName('#FF0000')).toBeNull();
            expect(colorManager.getColorName('invalid')).toBeNull();
        });
    });
});
