/**
 * @file mode-transition-rules.test.ts
 * @description Unit tests for mode transition rules
 *
 * Tests the transition matrix that governs which mode switches are allowed.
 * Follows testing-strategy-v2 Principle #6: Real, tricky test cases.
 */

import { describe, it, expect } from 'vitest';

import {
  canTransition,
  getTransitionRule,
  // TRANSITION_MATRIX, // Removed: unused
  // getAllTransitions // Removed: unused
} from '@/content/modes/mode-transition-rules';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

describe('Mode Transition Rules', () => {
  describe('Transition Matrix Completeness', () => {
    it('should include all 9 combinations (3x3 matrix)', () => {
      const modes: ModeType[] = ['basic', 'pro', 'pro_xai'];
      const expectedTransitions = modes.length * modes.length; // 3x3 = 9

      let actualTransitions = 0;
      for (const from of modes) {
        for (const to of modes) {
          const rule = getTransitionRule(from, to);
          expect(rule).toBeDefined();
          actualTransitions++;
        }
      }

      expect(actualTransitions).toBe(expectedTransitions);
    });

    it('should have no undefined transitions', () => {
      const modes: ModeType[] = ['basic', 'pro', 'pro_xai'];

      for (const from of modes) {
        for (const to of modes) {
          const rule = getTransitionRule(from, to);
          expect(rule).toBeDefined();
          expect(rule.allowed).toBeDefined();
          expect(rule.reason).toBeDefined();
        }
      }
    });
  });

  describe('Specific Transition Rules', () => {
    it('should allow basic → pro with confirmation warning', () => {
      const rule = getTransitionRule('basic', 'pro');

      expect(rule.allowed).toBe(true);
      expect(rule.requiresConfirmation).toBe(true);
      expect(rule.reason.toLowerCase()).toContain('sync');
    });

    it('should allow pro → pro_xai without confirmation', () => {
      const rule = getTransitionRule('pro', 'pro_xai');

      expect(rule.allowed).toBe(true);
      expect(rule.requiresConfirmation).toBe(false);
      expect(rule.reason).toContain('AI');
    });

    it('should allow pro_xai → basic with data preservation warning', () => {
      const rule = getTransitionRule('pro_xai', 'basic');

      expect(rule.allowed).toBe(true);
      expect(rule.requiresConfirmation).toBe(true);
      expect(rule.reason).toContain('preserved');
    });

    it('should handle same mode transition as no-op', () => {
      const modes: ModeType[] = ['basic', 'pro', 'pro_xai'];

      for (const mode of modes) {
        const rule = getTransitionRule(mode, mode);
        expect(rule.allowed).toBe(true);
        expect(rule.requiresConfirmation).toBe(false);
        expect(rule.reason.toLowerCase()).toContain('already');
      }
    });
  });

  describe('Transition Helpers', () => {
    it('should correctly determine if transition is allowed via canTransition', () => {
      // Allowed transitions
      expect(canTransition('basic', 'pro')).toBe(true);
      expect(canTransition('pro', 'pro_xai')).toBe(true);
      expect(canTransition('pro_xai', 'basic')).toBe(true);

      // Same mode (no-op, but allowed)
      expect(canTransition('basic', 'basic')).toBe(true);
    });

    it('should return detailed reason for blocked transitions', () => {
      // If we ever block a transition (future requirement), the reason should be clear
      // For now, all transitions are allowed, so we verify reason strings are meaningful
      const modes: ModeType[] = ['basic', 'pro', 'pro_xai'];

      for (const from of modes) {
        for (const to of modes) {
          const rule = getTransitionRule(from, to);
          expect(rule.reason).toBeTruthy();
          expect(rule.reason.length).toBeGreaterThan(10); // Meaningful reason
        }
      }
    });
  });

  describe('Guard Execution (Future)', () => {
    it('should define guard functions for transitions requiring confirmation', () => {
      const rule = getTransitionRule('basic', 'pro');

      // Guard should exist for confirmation-required transitions
      if (rule.requiresConfirmation) {
        expect(rule.guard).toBeDefined();
        expect(typeof rule.guard).toBe('function');
      }
    });
  });
});
