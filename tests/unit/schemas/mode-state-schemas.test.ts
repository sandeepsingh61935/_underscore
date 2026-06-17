/**
 * @file mode-state-schemas.test.ts
 * @description Unit tests for mode state Zod schemas
 *
 * Tests validation logic for all mode state schemas.
 * Follows AAA pattern (Arrange-Act-Assert).
 */

import { describe, it, expect } from 'vitest';

import {
  ModeTypeSchema,
  StateMetadataSchema,
  ModeStateSchema,
  ModeTransitionSchema,
  type ModeType,
  type ModeState,
} from '@/shared/schemas/mode-state-schemas';

describe('ModeTypeSchema', () => {
  it('should validate walk mode', () => {
    // Arrange
    const mode = 'ephemeral';

    // Act
    const result = ModeTypeSchema.safeParse(mode);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('ephemeral');
    }
  });

  it('should validate sprint mode', () => {
    // Arrange
    const mode = 'local';

    // Act
    const result = ModeTypeSchema.safeParse(mode);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('local');
    }
  });

  it('should validate vault mode', () => {
    // Arrange
    const mode = 'cloud';

    // Act
    const result = ModeTypeSchema.safeParse(mode);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('cloud');
    }
  });

  it('should reject invalid mode names', () => {
    // Arrange
    const invalidModes = ['invalid', 'gen', '', null, undefined, 123];

    // Act & Assert
    invalidModes.forEach((mode) => {
      const result = ModeTypeSchema.safeParse(mode);
      expect(result.success).toBe(false);
    });
  });

  it('should provide descriptive error messages', () => {
    // Arrange
    const invalidMode = 'invalid';

    // Act
    const result = ModeTypeSchema.safeParse(invalidMode);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('Invalid');
    }
  });
});

describe('StateMetadataSchema', () => {
  it('should validate metadata with all fields', () => {
    // Arrange
    const metadata = {
      version: 2,
      lastModified: Date.now(),
      flags: { debugMode: true, betaFeatures: false },
    };

    // Act
    const result = StateMetadataSchema.safeParse(metadata);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(2);
      expect(result.data.flags?.['debugMode']).toBe(true);
    }
  });

  it('should apply default version if not provided', () => {
    // Arrange
    const metadata = {
      lastModified: Date.now(),
    };

    // Act
    const result = StateMetadataSchema.safeParse(metadata);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(2);
    }
  });

  it('should validate metadata without optional flags', () => {
    // Arrange
    const metadata = {
      version: 2,
      lastModified: Date.now(),
    };

    // Act
    const result = StateMetadataSchema.safeParse(metadata);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe('ModeStateSchema', () => {
  it('should validate complete mode state', () => {
    // Arrange
    const state: ModeState = {
      currentMode: 'cloud',
      version: 2,
      metadata: {
        version: 2,
        lastModified: Date.now(),
      },
    };

    // Act
    const result = ModeStateSchema.safeParse(state);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentMode).toBe('cloud');
      expect(result.data.version).toBe(2);
    }
  });

  it('should apply default version if not provided', () => {
    // Arrange
    const state = {
      currentMode: 'ephemeral',
    };

    // Act
    const result = ModeStateSchema.safeParse(state);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(2);
    }
  });

  it('should reject invalid current mode', () => {
    // Arrange
    const state = {
      currentMode: 'invalid',
      version: 2,
    };

    // Act
    const result = ModeStateSchema.safeParse(state);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe('ModeTransitionSchema', () => {
  it('should validate allowed transition', () => {
    // Arrange
    const transition = {
      from: 'ephemeral',
      to: 'local',
      allowed: true,
    };

    // Act
    const result = ModeTransitionSchema.safeParse(transition);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowed).toBe(true);
    }
  });

  it('should validate blocked transition with reason', () => {
    // Arrange
    const transition = {
      from: 'cloud',
      to: 'ephemeral',
      allowed: false,
      requiresConfirmation: true,
      reason: 'Switching from Vault to Walk will lose unsaved highlights',
    };

    // Act
    const result = ModeTransitionSchema.safeParse(transition);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowed).toBe(false);
      expect(result.data.reason).toContain('lose unsaved highlights');
    }
  });

  it('should validate transition without optional fields', () => {
    // Arrange
    const transition = {
      from: 'local',
      to: 'cloud',
      allowed: true,
    };

    // Act
    const result = ModeTransitionSchema.safeParse(transition);

    // Assert
    expect(result.success).toBe(true);
  });
});

describe('Type Inference', () => {
  it('should infer correct TypeScript types', () => {
    // Arrange & Act
    const mode: ModeType = 'ephemeral';
    const state: ModeState = {
      currentMode: 'cloud',
      version: 2,
    };

    // Assert - TypeScript compilation is the test
    expect(mode).toBe('ephemeral');
    expect(state.currentMode).toBe('cloud');
  });
});
