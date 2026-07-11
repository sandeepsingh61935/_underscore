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
  it('should validate basic mode', () => {
    // Arrange
    const mode = 'basic';

    // Act
    const result = ModeTypeSchema.safeParse(mode);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('basic');
    }
  });

  it('should validate pro mode', () => {
    // Arrange
    const mode = 'pro';

    // Act
    const result = ModeTypeSchema.safeParse(mode);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('pro');
    }
  });

  it('should validate pro_xai mode', () => {
    // Arrange
    const mode = 'pro_xai';

    // Act
    const result = ModeTypeSchema.safeParse(mode);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('pro_xai');
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
      currentMode: 'pro',
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
      expect(result.data.currentMode).toBe('pro');
      expect(result.data.version).toBe(2);
    }
  });

  it('should apply default version if not provided', () => {
    // Arrange
    const state = {
      currentMode: 'basic',
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
      from: 'basic',
      to: 'pro',
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
      from: 'pro_xai',
      to: 'basic',
      allowed: false,
      requiresConfirmation: true,
      reason: 'Switching from 10x-Pro to Basic will lose unsaved highlights',
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
      from: 'pro',
      to: 'pro_xai',
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
    const mode: ModeType = 'basic';
    const state: ModeState = {
      currentMode: 'pro',
      version: 2,
    };

    // Assert - TypeScript compilation is the test
    expect(mode).toBe('basic');
    expect(state.currentMode).toBe('pro');
  });
});
