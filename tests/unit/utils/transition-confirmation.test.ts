/**
 * @file transition-confirmation.test.ts
 * @description Tests for transition confirmation UI
 *
 * Tests the user confirmation flow for transitions requiring approval.
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { requestTransitionConfirmation } from '@/shared/utils/transition-confirmation';

describe('Transition Confirmation', () => {
  beforeEach(() => {
    // Clear any previous confirmations
    vi.clearAllMocks();
  });

  describe('Confirmation request', () => {
    it('should return true for user approval', async () => {
      // Mock user clicking "OK"
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const result = await requestTransitionConfirmation(
        'sprint',
        'vault',
        'Switching to Vault mode will archive all highlights permanently.'
      );

      expect(result).toBe(true);
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('vault'));
    });

    it('should return false for user denial', async () => {
      // Mock user clicking "Cancel"
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const result = await requestTransitionConfirmation(
        'vault',
        'walk',
        'Switching to Walk mode may result in data loss.'
      );

      expect(result).toBe(false);
      expect(window.confirm).toHaveBeenCalled();
    });

    it('should include transition reason in confirmation message', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      await requestTransitionConfirmation('vault', 'walk', 'Data may be lost!');

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Data may be lost')
      );
    });
  });

  describe('Integration with guards', () => {
    it('should be callable from guard functions', async () => {
      // Simulate guard calling confirmation
      const guardFunction = async () => {
        return await requestTransitionConfirmation('sprint', 'vault', 'Confirm archival');
      };

      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const result = await guardFunction();

      expect(result).toBe(true);
    });

    it('should handle confirmation errors gracefully', async () => {
      // Simulate confirmation throwing error
      vi.spyOn(window, 'confirm').mockImplementation(() => {
        throw new Error('Dialog blocked');
      });

      const result = await requestTransitionConfirmation(
        'sprint',
        'vault',
        'Test message'
      );

      // Should return false on error (safe default)
      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty reason string', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const result = await requestTransitionConfirmation('walk', 'sprint', '');

      expect(result).toBe(true);
      expect(window.confirm).toHaveBeenCalled();
    });

    it('should handle very long reason messages', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const longReason = 'A'.repeat(500);
      const result = await requestTransitionConfirmation('sprint', 'vault', longReason);

      expect(result).toBe(true);
    });
  });
});
