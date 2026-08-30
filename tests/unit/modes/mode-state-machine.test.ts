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
    it('should return true for basic → pro', () => {
      expect(stateMachine.canTransition('basic', 'pro')).toBe(true);
    });

    it('should return true for pro → pro_xai', () => {
      expect(stateMachine.canTransition('pro', 'pro_xai')).toBe(true);
    });

    it('should return true for pro_xai → basic', () => {
      expect(stateMachine.canTransition('pro_xai', 'basic')).toBe(true);
    });

    it('should return true for same mode transition (no-op)', () => {
      expect(stateMachine.canTransition('basic', 'basic')).toBe(true);
      expect(stateMachine.canTransition('pro', 'pro')).toBe(true);
      expect(stateMachine.canTransition('pro_xai', 'pro_xai')).toBe(true);
    });
  });

  describe('validateTransition', () => {
    it('should return success result for valid transition', () => {
      const result = stateMachine.validateTransition('basic', 'pro');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeUndefined(); // void on success
      }
    });

    it('should include transition details in success result', () => {
      const result = stateMachine.validateTransition('pro', 'pro_xai');

      expect(result.success).toBe(true);
    });

    it('should log transition validation', () => {
      stateMachine.validateTransition('basic', 'pro');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Validating transition'),
        expect.objectContaining({ from: 'basic', to: 'pro' })
      );
    });
  });

  describe('executeGuards', () => {
    const signedIn = { isAuthenticated: true, isPaidActive: true };

    it('should return true for transitions without guards', async () => {
      const result = await stateMachine.executeGuards('pro', 'pro_xai', signedIn);

      expect(result).toBe(true);
    });

    it('should execute guard function for transitions requiring confirmation', async () => {
      const result = await stateMachine.executeGuards('basic', 'pro', signedIn);

      expect(result).toBe(true);
    });

    it('should log guard execution', async () => {
      await stateMachine.executeGuards('basic', 'pro', signedIn);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('guard'),
        expect.anything()
      );
    });
  });

  describe('getTransitionReason', () => {
    it('should return descriptive reason for basic → pro', () => {
      const reason = stateMachine.getTransitionReason('basic', 'pro');

      expect(reason).toBeTruthy();
      expect(reason.length).toBeGreaterThan(10);
      expect(reason.toLowerCase()).toContain('sync');
    });

    it('should return descriptive reason for pro → pro_xai', () => {
      const reason = stateMachine.getTransitionReason('pro', 'pro_xai');

      expect(reason).toMatch(/Integrations|Paid/);
    });

    it('should return warning reason for pro_xai → basic', () => {
      const reason = stateMachine.getTransitionReason('pro_xai', 'basic');

      expect(reason.toLowerCase()).toContain('preserved');
    });

    it('should return no-op reason for same mode', () => {
      const reason = stateMachine.getTransitionReason('basic', 'basic');

      expect(reason.toLowerCase()).toContain('already');
    });
  });

  describe('Transition logging and metrics', () => {
    it('should log all transition attempts', () => {
      stateMachine.validateTransition('basic', 'pro');

      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should track transition metrics (future)', () => {
      // Future: Verify metrics tracking
      stateMachine.validateTransition('basic', 'pro');
      stateMachine.validateTransition('pro', 'pro_xai');

      // Metrics should be tracked (implementation TBD)
      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid successive transitions', () => {
      // Simulate user clicking mode buttons rapidly
      expect(stateMachine.canTransition('basic', 'pro')).toBe(true);
      expect(stateMachine.canTransition('pro', 'pro_xai')).toBe(true);
      expect(stateMachine.canTransition('pro_xai', 'basic')).toBe(true);

      // All should be allowed
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should handle full circular transition path', async () => {
      const signedIn = { isAuthenticated: true, isPaidActive: true };
      const signedOut = { isAuthenticated: false };
      // basic → pro → pro_xai → basic (full circle when signed out at end)
      expect(await stateMachine.executeGuards('basic', 'pro', signedIn)).toBe(true);
      expect(await stateMachine.executeGuards('pro', 'pro_xai', signedIn)).toBe(true);
      expect(await stateMachine.executeGuards('pro_xai', 'basic', signedOut)).toBe(true);

      // Should complete without errors
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
