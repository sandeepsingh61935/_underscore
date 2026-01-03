/**
 * @file state-errors.test.ts
 * @description Comprehensive tests for state management error hierarchy
 *
 * Tests include tricky, realistic edge cases to push error handling limits:
 * - Circular references in context
 * - Very large context objects
 * - Error chaining and causality
 * - Serialization edge cases
 * - Cross-module instanceof checks
 */

import { describe, it, expect } from 'vitest';

import { AppError } from '@/shared/errors/app-error';
import {
  StateValidationError,
  StateTransitionError,
  StatePersistenceError,
  StateMigrationError,
} from '@/shared/errors/state-errors';

describe('State Error Hierarchy', () => {
  describe('Error class inheritance', () => {
    it('should extend AppError', () => {
      const errors = [
        new StateValidationError('test'),
        new StateTransitionError('test', 'walk', 'gen'),
        new StatePersistenceError('test'),
        new StateMigrationError('test', 1, 2),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('should allow instanceof checks across module boundaries', () => {
      // Simulate error thrown from different module context
      const error = new StateValidationError('test');
      const errorFromJSON = Object.create(StateValidationError.prototype);
      Object.assign(errorFromJSON, error);

      expect(errorFromJSON).toBeInstanceOf(StateValidationError);
    });
  });

  describe('Error codes', () => {
    it('should have unique error codes for each type', () => {
      const codes = [
        new StateValidationError('test').code,
        new StateTransitionError('test', 'walk', 'sprint').code,
        new StatePersistenceError('test').code,
        new StateMigrationError('test', 1, 2).code,
      ];

      // All codes should be unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should follow STATE_XXX naming convention', () => {
      const errors = [
        new StateValidationError('test'),
        new StateTransitionError('test', 'walk', 'sprint'),
        new StatePersistenceError('test'),
        new StateMigrationError('test', 1, 2),
      ];

      errors.forEach((error) => {
        expect(error.code).toMatch(/^STATE_\d{3}$/);
      });
    });
  });

  describe('Error context', () => {
    it('should include field name in validation errors', () => {
      const error = new StateValidationError('Invalid mode', {
        field: 'defaultMode',
        value: 'invalid',
        validValues: ['walk', 'sprint', 'vault'],
      });

      expect(error.context).toMatchObject({
        field: 'defaultMode',
        value: 'invalid',
      });
    });

    it('should include from/to modes in transition errors', () => {
      const error = new StateTransitionError('Transition not allowed', 'walk', 'gen');

      expect(error.context).toMatchObject({
        from: 'walk',
        to: 'gen',
      });
    });

    it('should include version info in migration errors', () => {
      const error = new StateMigrationError('Migration failed', 1, 2, {
        originalError: 'Schema mismatch',
      });

      expect(error.context).toMatchObject({
        fromVersion: 1,
        toVersion: 2,
      });
    });

    it('should handle very large context objects (performance)', () => {
      // Simulate logging huge state object
      const largeContext: any = {};
      for (let i = 0; i < 1000; i++) {
        largeContext[`field${i}`] = 'x'.repeat(100);
      }

      const start = Date.now();
      const error = new StateValidationError('test', largeContext);
      const duration = Date.now() - start;

      // Should create error quickly even with large context
      expect(duration).toBeLessThan(100); // < 100ms
      expect(error.context).toBe(largeContext);
    });

    it('should handle circular references in context', () => {
      // Simulate circular object graph (common in debug contexts)
      const circular: any = { name: 'parent' };
      circular.self = circular;
      circular.child = { parent: circular };

      // Should not throw when creating error
      expect(() => {
        new StateValidationError('test', circular);
      }).not.toThrow();
    });

    it('should handle undefined/null context gracefully', () => {
      const error1 = new StateValidationError('test', undefined);
      const error2 = new StateValidationError('test', null as any);

      expect(error1.context).toBeUndefined();
      expect(error2.context).toBeNull();
    });
  });

  describe('JSON serialization', () => {
    it('should be JSON serializable', () => {
      const error = new StateValidationError('Invalid state', {
        field: 'mode',
        value: 'invalid',
      });

      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('StateValidationError');
      expect(parsed.message).toBe('Invalid state');
      expect(parsed.code).toBe(error.code);
    });

    it('should handle circular references in toJSON()', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;

      const error = new StateValidationError('test', circular);

      // Should not throw on JSON.stringify
      expect(() => {
        JSON.stringify(error);
      }).not.toThrow();
    });

    it('should include stack trace in JSON', () => {
      const error = new StateValidationError('test');
      const json = error.toJSON();

      expect(json).toHaveProperty('stack');
      expect(typeof (json as any).stack).toBe('string');
    });

    it('should serialize nested errors (error chaining)', () => {
      const cause = new Error('Original failure');
      const error = new StateMigrationError('Migration failed', 1, 2, {
        cause: cause,
      });

      const json = JSON.stringify(error);
      expect(json).toContain('Original failure');
    });
  });

  describe('Error messages', () => {
    it('should have descriptive, user-friendly messages', () => {
      const errors = [
        new StateValidationError('Mode "invalid" is not recognized'),
        new StateTransitionError('Cannot transition from walk to gen', 'walk', 'gen'),
        new StatePersistenceError('Failed to save state: quota exceeded'),
        new StateMigrationError('Cannot migrate from v1 to v3: missing v2', 1, 3),
      ];

      errors.forEach((error) => {
        expect(error.message.length).toBeGreaterThan(10);
        expect(error.message).not.toMatch(/code|stack|undefined/i);
      });
    });

    it('should include error code in message when code is available', () => {
      const error = new StateValidationError('Invalid state');
      expect(error.toString()).toContain(error.code);
    });
  });

  describe('Stack trace preservation', () => {
    it('should preserve stack trace from creation point', () => {
      function deepFunction() {
        function nestedFunction() {
          return new StateValidationError('test');
        }
        return nestedFunction();
      }

      const error = deepFunction();
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('nestedFunction');
    });

    it('should not include constructor frames in stack', () => {
      const error = new StateValidationError('test');

      // Stack should start from call site, not constructor
      expect(error.stack).not.toContain('new StateValidationError');
    });
  });

  describe('Error-specific functionality', () => {
    describe('StateTransitionError', () => {
      it('should store from and to modes', () => {
        const error = new StateTransitionError('blocked', 'sprint', 'vault');

        expect(error.from).toBe('sprint');
        expect(error.to).toBe('vault');
      });

      it('should handle same from/to mode (no-op transition)', () => {
        const error = new StateTransitionError('redundant', 'walk', 'walk');

        expect(error.from).toBe(error.to);
      });
    });

    describe('StateMigrationError', () => {
      it('should store version numbers', () => {
        const error = new StateMigrationError('failed', 1, 2);

        expect(error.fromVersion).toBe(1);
        expect(error.toVersion).toBe(2);
      });

      it('should handle backward migration (downgrade)', () => {
        const error = new StateMigrationError('downgrade not supported', 2, 1);

        expect(error.fromVersion).toBeGreaterThan(error.toVersion);
      });

      it('should handle large version jumps', () => {
        const error = new StateMigrationError('missing intermediate versions', 1, 10);

        expect(error.toVersion - error.fromVersion).toBe(9);
      });
    });

    describe('StatePersistenceError', () => {
      it('should indicate if error is quota-related', () => {
        const quotaError = new StatePersistenceError('Quota exceeded', {
          quotaExceeded: true,
          currentSize: 102400,
          maxSize: 102400,
        });

        expect(quotaError.context?.['quotaExceeded']).toBe(true);
      });

      it('should handle storage corruption scenarios', () => {
        const corruptionError = new StatePersistenceError('Corrupted storage', {
          corruptionDetected: true,
          recoveryAttempted: true,
        });

        expect(corruptionError.context?.['corruptionDetected']).toBe(true);
      });
    });
  });

  describe('Realistic error scenarios', () => {
    it('should handle concurrent error creation (race conditions)', async () => {
      const errors = await Promise.all([
        Promise.resolve(new StateValidationError('error1')),
        Promise.resolve(new StateValidationError('error2')),
        Promise.resolve(new StateValidationError('error3')),
      ]);

      expect(errors).toHaveLength(3);
      errors.forEach((error) => {
        expect(error).toBeInstanceOf(StateValidationError);
      });
    });

    it('should handle error thrown during error creation (meta-error)', () => {
      // Simulate context getter that throws
      const badContext = {
        get problematicField() {
          throw new Error('Context accessor failed');
        },
      };

      // Should not throw when accessing context during error creation
      expect(() => {
        new StateValidationError('test', badContext);
      }).not.toThrow();
    });

    it('should handle error comparison and deduplication', () => {
      const error1 = new StateValidationError('Invalid mode', { field: 'mode' });
      const error2 = new StateValidationError('Invalid mode', { field: 'mode' });

      // Same message and code, but different instances
      expect(error1).not.toBe(error2);
      expect(error1.code).toBe(error2.code);
      expect(error1.message).toBe(error2.message);
    });
  });
});
