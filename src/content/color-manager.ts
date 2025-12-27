/**
 * @file color-manager.ts
 * @description Manages highlight color palette and current selection
 */

import { SecurityService } from '@/shared/utils/security';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Color palette - 5 presets from design tokens
 */
export const COLOR_PALETTE = {
    yellow: '#FFEB3B',
    blue: '#64B5F6',
    green: '#81C784',
    orange: '#FFB74D',
    purple: '#BA68C8',
} as const;

export type ColorName = keyof typeof COLOR_PALETTE;

const DEFAULT_COLOR: ColorName = 'yellow';
const STORAGE_KEY = 'currentHighlightColor';

/**
 * Manages highlight color selection and palette
 * 
 * Features:
 * - 5-color preset palette
 * - Current color persistence via chrome.storage.local
 * - Color validation
 * 
 * @example
 * ```typescript
 * const colorManager = new ColorManager();
 * await colorManager.initialize();
 * 
 * const color = await colorManager.getCurrentColor(); // '#FFEB3B'
 * await colorManager.setCurrentColor('blue');
 * ```
 */
export class ColorManager {
    private currentColor: string = COLOR_PALETTE[DEFAULT_COLOR];
    private logger: ILogger;
    private initialized = false;

    constructor() {
        this.logger = LoggerFactory.getLogger('ColorManager');
    }

    /**
     * Initialize color manager and load saved color from storage
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            this.logger.warn('ColorManager already initialized');
            return;
        }

        try {
            // Load saved color from chrome.storage.local
            const result = await chrome.storage.local.get(STORAGE_KEY);

            if (result[STORAGE_KEY]) {
                const savedColor = result[STORAGE_KEY] as string;

                // Validate saved color
                if (this.isValidPaletteColor(savedColor)) {
                    this.currentColor = savedColor;
                    this.logger.info('Loaded saved color', { color: savedColor });
                } else {
                    this.logger.warn('Invalid saved color, using default', { savedColor });
                    this.currentColor = COLOR_PALETTE[DEFAULT_COLOR];
                }
            } else {
                this.logger.info('No saved color, using default');
                this.currentColor = COLOR_PALETTE[DEFAULT_COLOR];
            }

            this.initialized = true;
            this.logger.info('ColorManager initialized');
        } catch (error) {
            this.logger.error('Failed to initialize ColorManager', error as Error);
            // Fall back to default color
            this.currentColor = COLOR_PALETTE[DEFAULT_COLOR];
            this.initialized = true;
        }
    }

    /**
     * Get current selected color
     */
    async getCurrentColor(): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.currentColor;
    }

    /**
     * Set current color and persist to storage
     */
    async setCurrentColor(color: string): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Validate color
        if (!this.isValidPaletteColor(color) && !SecurityService.isValidHexColor(color)) {
            this.logger.error('Invalid color', { color });
            throw new Error(`Invalid color: ${color}`);
        }

        const previousColor = this.currentColor;
        this.currentColor = color;

        try {
            // Persist to storage
            await chrome.storage.local.set({ [STORAGE_KEY]: color });

            this.logger.info('Color changed', { previousColor, newColor: color });
        } catch (error) {
            this.logger.error('Failed to save color to storage', error as Error);
            // Continue anyway - color is changed in memory
        }
    }

    /**
     * Get all available palette colors
     */
    getColorPalette(): Record<ColorName, string> {
        return { ...COLOR_PALETTE };
    }

    /**
     * Get default color
     */
    getDefaultColor(): string {
        return COLOR_PALETTE[DEFAULT_COLOR];
    }

    /**
     * Check if color is in the preset palette
     */
    private isValidPaletteColor(color: string): boolean {
        return Object.values(COLOR_PALETTE).includes(color as any);
    }

    /**
     * Get color name from hex value
     */
    getColorName(hexColor: string): ColorName | null {
        for (const [name, hex] of Object.entries(COLOR_PALETTE)) {
            if (hex.toLowerCase() === hexColor.toLowerCase()) {
                return name as ColorName;
            }
        }
        return null;
    }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
}
}
