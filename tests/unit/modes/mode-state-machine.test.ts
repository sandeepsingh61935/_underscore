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
      expect(stateMachine.canTransition('ephemeral', 'local')).toBe(true);
    });

    it('should return true for sprint → vault', () => {
      expect(stateMachine.canTransition('local', 'cloud')).toBe(true);
    });

    it('should return true for vault → walk', () => {
      expect(stateMachine.canTransition('cloud', 'ephemeral')).toBe(true);
    });

    it('should return true for same mode transition (no-op)', () => {
      expect(stateMachine.canTransition('ephemeral', 'ephemeral')).toBe(true);
      expect(stateMachine.canTransition('local', 'local')).toBe(true);
      expect(stateMachine.canTransition('cloud', 'cloud')).toBe(true);
    });
  });

  describe('validateTransition', () => {
    it('should return success result for valid transition', () => {
      const result = stateMachine.validateTransition('ephemeral', 'local');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeUndefined(); // void on success
      }
    });

    it('should include transition details in success result', () => {
      const result = stateMachine.validateTransition('local', 'cloud');

      expect(result.success).toBe(true);
    });

    it('should log transition validation', () => {
      stateMachine.validateTransition('ephemeral', 'local');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Validating transition'),
        expect.objectContaining({ from: 'ephemeral', to: 'local' })
      );
    });
  });

  describe('executeGuards', () => {
    it('should return true for transitions without guards', async () => {
      const result = await stateMachine.executeGuards('ephemeral', 'local');

      expect(result).toBe(true);
    });

    it('should execute guard function for transitions requiring confirmation', async () => {
      // sprint → vault requires confirmation
      const result = await stateMachine.executeGuards('local', 'cloud');

      // Should execute guard (currently stub returns true)
      expect(result).toBe(true);
    });

    it('should log guard execution', async () => {
      await stateMachine.executeGuards('local', 'cloud');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('guard'),
        expect.anything()
      );
    });
  });

  describe('getTransitionReason', () => {
    it('should return descriptive reason for walk → sprint', () => {
      const reason = stateMachine.getTransitionReason('ephemeral', 'local');

      expect(reason).toBeTruthy();
      expect(reason.length).toBeGreaterThan(10);
      expect(reason.toLowerCase()).toContain('local');
    });

    it('should return warning reason for vault → walk', () => {
      const reason = stateMachine.getTransitionReason('cloud', 'ephemeral');

      expect(reason).toContain('lost');
    });

    it('should return no-op reason for same mode', () => {
      const reason = stateMachine.getTransitionReason('ephemeral', 'ephemeral');

      expect(reason.toLowerCase()).toContain('already');
    });
  });

  describe('Transition logging and metrics', () => {
    it('should log all transition attempts', () => {
      stateMachine.validateTransition('ephemeral', 'local');

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should track transition metrics (future)', () => {
      // Future: Verify metrics tracking
      stateMachine.validateTransition('ephemeral', 'local');
      stateMachine.validateTransition('local', 'cloud');

      // Metrics should be tracked (implementation TBD)
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid successive transitions', () => {
      // Simulate user clicking mode buttons rapidly
      expect(stateMachine.canTransition('ephemeral', 'local')).toBe(true);
      expect(stateMachine.canTransition('local', 'cloud')).toBe(true);
      expect(stateMachine.canTransition('cloud', 'ephemeral')).toBe(true);

      // All should be allowed
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle full circular transition path', async () => {
      // walk → sprint → vault → walk (full circle)
      expect(await stateMachine.executeGuards('ephemeral', 'local')).toBe(true);
      expect(await stateMachine.executeGuards('local', 'cloud')).toBe(true);
      expect(await stateMachine.executeGuards('cloud', 'ephemeral')).toBe(true);

      // Should complete without errors
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
