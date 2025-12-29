/**
 * @file color-manager.test.ts
 * @description Unit tests for ColorManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ColorManager, type ColorRole } from '@/content/color-manager';

// Mock wxt/browser
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: (...args: any[]) => mockStorageGet(...args),
        set: (...args: any[]) => mockStorageSet(...args),
      },
    },
  },
}));

describe('ColorManager', () => {
  let colorManager: ColorManager;

  beforeEach(() => {
    vi.clearAllMocks();
    colorManager = new ColorManager();
  });

  describe('Initialization', () => {
    it('should initialize with default role when no saved role', async () => {
      mockStorageGet.mockResolvedValue({});

      await colorManager.initialize();
      const role = await colorManager.getCurrentColorRole();

      expect(role).toBe('yellow');
      expect(colorManager.isInitialized()).toBe(true);
    });

    it('should load saved role from storage', async () => {
      mockStorageGet.mockResolvedValue({
        currentColorRole: 'blue',
      });

      await colorManager.initialize();
      const role = await colorManager.getCurrentColorRole();

      expect(role).toBe('blue');
    });

    it('should use default role if saved role is invalid', async () => {
      mockStorageGet.mockResolvedValue({
        currentColorRole: 'invalid-role',
      });

      await colorManager.initialize();
      const role = await colorManager.getCurrentColorRole();

      expect(role).toBe('yellow');
    });

    it('should not initialize twice', async () => {
      mockStorageGet.mockResolvedValue({});

      await colorManager.initialize();
      await colorManager.initialize(); // Second call

      expect(mockStorageGet).toHaveBeenCalledTimes(1);
    });

    it('should handle storage errors gracefully', async () => {
      mockStorageGet.mockRejectedValue(new Error('Storage error'));

      await colorManager.initialize();
      const role = await colorManager.getCurrentColorRole();

      expect(role).toBe('yellow'); // Falls back to default
      expect(colorManager.isInitialized()).toBe(true);
    });
  });

  describe('getCurrentColorRole', () => {
    it('should return current role', async () => {
      mockStorageGet.mockResolvedValue({});

      const role = await colorManager.getCurrentColorRole();

      expect(role).toBe('yellow');
    });

    it('should auto-initialize if not initialized', async () => {
      mockStorageGet.mockResolvedValue({});

      expect(colorManager.isInitialized()).toBe(false);

      await colorManager.getCurrentColorRole();

      expect(colorManager.isInitialized()).toBe(true);
    });
  });

  describe('setCurrentColorRole', () => {
    beforeEach(async () => {
      mockStorageGet.mockResolvedValue({});
      mockStorageSet.mockResolvedValue(undefined);
      await colorManager.initialize();
    });

    it('should set valid role', async () => {
      await colorManager.setCurrentColorRole('green');
      const role = await colorManager.getCurrentColorRole();

      expect(role).toBe('green');
      expect(mockStorageSet).toHaveBeenCalledWith({
        currentColorRole: 'green',
      });
    });

    it('should reject invalid role', async () => {
      await expect(
        colorManager.setCurrentColorRole('invalid' as ColorRole)
      ).rejects.toThrow('Invalid color role');
    });

    it('should continue if storage.set fails', async () => {
      mockStorageSet.mockRejectedValue(new Error('Storage error'));

      // Should verify it doesn't throw
      await colorManager.setCurrentColorRole('purple');
      const role = await colorManager.getCurrentColorRole();

      expect(role).toBe('purple'); // Role changed in memory
    });
  });

  describe('getCSSVariableName', () => {
    it('should return correct CSS variable', async () => {
      mockStorageGet.mockResolvedValue({});
      await colorManager.setCurrentColorRole('blue');
      expect(colorManager.getCSSVariableName()).toBe('--highlight-blue');
    });
  });

  describe('getColorRoles', () => {
    it('should return all available roles', () => {
      const roles = colorManager.getColorRoles();
      // yellow, orange, blue, green, purple, pink, teal = 7 roles
      expect(roles).toHaveLength(7);
      expect(roles).toContain('yellow');
      expect(roles).toContain('teal');
    });
  });

  describe('getDefaultColorRole', () => {
    it('should return yellow as default', () => {
      const defaultRole = colorManager.getDefaultColorRole();
      expect(defaultRole).toBe('yellow');
    });
  });
});
