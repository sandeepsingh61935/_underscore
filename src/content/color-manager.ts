/**
 * @file color-manager.ts
 * @description Manages highlight color roles for CSS-first reactive theming
 * 
 * Features:
 * - Semantic color roles (yellow, blue, orange, etc.)
 * - CSS design token integration
 * - Automatic theme adaptation via CSS variables
 */

import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Available color roles - map to CSS design tokens
 */
export const COLOR_ROLES = {
    yellow: 'yellow',
    orange: 'orange',
    blue: 'blue',
    green: 'green',
    purple: 'purple',
    pink: 'pink',
    teal: 'teal',
} as const;

export type ColorRole = keyof typeof COLOR_ROLES;

const DEFAULT_ROLE: ColorRole = 'yellow';
const STORAGE_KEY = 'currentColorRole';

/**
 * Manages highlight color roles
 * 
 * @example
 * ```typescript
 * const colorManager = new ColorManager();
 * await colorManager.initialize();
 * 
 * const role = await colorManager.getCurrentColorRole(); // 'yellow'
 * await colorManager.setCurrentColorRole('blue');
 * ```
 */
export class ColorManager {
    private currentColorRole: ColorRole = DEFAULT_ROLE;
    private logger: ILogger;
    private initialized = false;

    constructor() {
        this.logger = LoggerFactory.getLogger('ColorManager');
    }

    /**
     * Initialize color manager and load saved role from storage
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            this.logger.warn('ColorManager already initialized');
            return;
        }

        try {
            // Load saved role from chrome.storage.local
            const result = await chrome.storage.local.get(STORAGE_KEY);

            if (result[STORAGE_KEY]) {
                const savedRole = result[STORAGE_KEY] as string;

                // Validate saved role
                if (this.isValidColorRole(savedRole as ColorRole)) {
                    this.currentColorRole = savedRole as ColorRole;
                    this.logger.info('Loaded saved color role', { role: savedRole });
                } else {
                    this.logger.warn('Invalid saved role, using default', { savedRole });
                    this.currentColorRole = DEFAULT_ROLE;
                }
            } else {
                this.logger.info('No saved role, using default');
                this.currentColorRole = DEFAULT_ROLE;
            }

            this.initialized = true;
            this.logger.info('ColorManager initialized', { role: this.currentColorRole });
        } catch (error) {
            this.logger.error('Failed to initialize ColorManager', error as Error);
            this.currentColorRole = DEFAULT_ROLE;
            this.initialized = true;
        }
    }

    /**
     * Get current color role (semantic token)
     */
    async getCurrentColorRole(): Promise<ColorRole> {
        if (!this.initialized) {
            await this.initialize();
        }
        return this.currentColorRole;
    }

    /**
     * Get CSS variable name for current color role
     */
    getCSSVariableName(): string {
        return `--highlight-${this.currentColorRole}`;
    }

    /**
     * Set current color role and persist to storage
     */
    async setCurrentColorRole(role: ColorRole): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Validate role
        if (!this.isValidColorRole(role)) {
            this.logger.error('Invalid color role', { role });
            throw new Error(`Invalid color role: ${role}`);
        }

        const previousRole = this.currentColorRole;
        this.currentColorRole = role;

        try {
            // Persist to storage
            await chrome.storage.local.set({ [STORAGE_KEY]: role });

            this.logger.info('Color role changed', { previousRole, newRole: role });
        } catch (error) {
            this.logger.error('Failed to save role to storage', error as Error);
        }
    }

    /**
     * Get all available color roles
     */
    getColorRoles(): ColorRole[] {
        return Object.keys(COLOR_ROLES) as ColorRole[];
    }

    /**
     * Get default color role
     */
    getDefaultColorRole(): ColorRole {
        return DEFAULT_ROLE;
    }

    /**
     * Check if color role is valid
     */
    private isValidColorRole(role: ColorRole): boolean {
        return Object.keys(COLOR_ROLES).includes(role);
    }

    /**
     * Check if manager is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}
