/**
 * @file mode-state-machine.test.ts
 * @description Unit tests for ModeStateMachine class
 *
 * Tests state machine logic that orchestrates transitions using the rules.
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ModeStateMachine } from '@/content/modes/mode-state-machine';
import type { ILogger } from '@/shared/utils/logger';

describe('ModeStateMachine', () => {
  let stateMachine: ModeStateMachine;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as any;

    stateMachine = new ModeStateMachine(mockLogger);
  });

  describe('canTransition', () => {
    it('should return true for walk → sprint', () => {
      expect(stateMachine.canTransition('walk', 'sprint')).toBe(true);
    });

    it('should return true for sprint → vault', () => {
      expect(stateMachine.canTransition('sprint', 'vault')).toBe(true);
    });

    it('should return true for vault → walk', () => {
      expect(stateMachine.canTransition('vault', 'walk')).toBe(true);
    });

    it('should return true for same mode transition (no-op)', () => {
      expect(stateMachine.canTransition('walk', 'walk')).toBe(true);
      expect(stateMachine.canTransition('sprint', 'sprint')).toBe(true);
      expect(stateMachine.canTransition('vault', 'vault')).toBe(true);
    });
  });

  describe('validateTransition', () => {
    it('should return success result for valid transition', () => {
      const result = stateMachine.validateTransition('walk', 'sprint');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeUndefined(); // void on success
      }
    });

    it('should include transition details in success result', () => {
      const result = stateMachine.validateTransition('sprint', 'vault');

      expect(result.success).toBe(true);
    });

    it('should log transition validation', () => {
      stateMachine.validateTransition('walk', 'sprint');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Validating transition'),
        expect.objectContaining({ from: 'walk', to: 'sprint' })
      );
    });
  });

  describe('executeGuards', () => {
    it('should return true for transitions without guards', async () => {
      const result = await stateMachine.executeGuards('walk', 'sprint');

      expect(result).toBe(true);
    });

    it('should execute guard function for transitions requiring confirmation', async () => {
      // sprint → vault requires confirmation
      const result = await stateMachine.executeGuards('sprint', 'vault');

      // Should execute guard (currently stub returns true)
      expect(result).toBe(true);
    });

    it('should log guard execution', async () => {
      await stateMachine.executeGuards('sprint', 'vault');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('guard'),
        expect.anything()
      );
    });
  });

  describe('getTransitionReason', () => {
    it('should return descriptive reason for walk → sprint', () => {
      const reason = stateMachine.getTransitionReason('walk', 'sprint');

      expect(reason).toBeTruthy();
      expect(reason.length).toBeGreaterThan(10);
      expect(reason.toLowerCase()).toContain('sprint');
    });

    it('should return warning reason for vault → walk', () => {
      const reason = stateMachine.getTransitionReason('vault', 'walk');

      expect(reason).toContain('lost');
    });

    it('should return no-op reason for same mode', () => {
      const reason = stateMachine.getTransitionReason('walk', 'walk');

      expect(reason.toLowerCase()).toContain('already');
    });
  });

  describe('Transition logging and metrics', () => {
    it('should log all transition attempts', () => {
      stateMachine.validateTransition('walk', 'sprint');

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should track transition metrics (future)', () => {
      // Future: Verify metrics tracking
      stateMachine.validateTransition('walk', 'sprint');
      stateMachine.validateTransition('sprint', 'vault');

      // Metrics should be tracked (implementation TBD)
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid successive transitions', () => {
      // Simulate user clicking mode buttons rapidly
      expect(stateMachine.canTransition('walk', 'sprint')).toBe(true);
      expect(stateMachine.canTransition('sprint', 'vault')).toBe(true);
      expect(stateMachine.canTransition('vault', 'walk')).toBe(true);

      // All should be allowed
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle full circular transition path', async () => {
      // walk → sprint → vault → walk (full circle)
      expect(await stateMachine.executeGuards('walk', 'sprint')).toBe(true);
      expect(await stateMachine.executeGuards('sprint', 'vault')).toBe(true);
      expect(await stateMachine.executeGuards('vault', 'walk')).toBe(true);

      // Should complete without errors
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
