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
    StateChangeEventSchema,
    StateMetadataSchema,
    ModeStateSchema,
    ModeTransitionSchema,
    type ModeType,
    type StateChangeEvent,
    type ModeState,
} from '@/shared/schemas/mode-state-schemas';

describe('ModeTypeSchema', () => {
    it('should validate walk mode', () => {
        // Arrange
        const mode = 'walk';

        // Act
        const result = ModeTypeSchema.safeParse(mode);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('walk');
        }
    });

    it('should validate sprint mode', () => {
        // Arrange
        const mode = 'sprint';

        // Act
        const result = ModeTypeSchema.safeParse(mode);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('sprint');
        }
    });

    it('should validate vault mode', () => {
        // Arrange
        const mode = 'vault';

        // Act
        const result = ModeTypeSchema.safeParse(mode);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('vault');
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

describe('StateChangeEventSchema', () => {
    it('should validate complete state change event', () => {
        // Arrange
        const event: StateChangeEvent = {
            from: 'walk',
            to: 'sprint',
            timestamp: Date.now(),
            reason: 'User clicked sprint mode button',
        };

        // Act
        const result = StateChangeEventSchema.safeParse(event);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.from).toBe('walk');
            expect(result.data.to).toBe('sprint');
            expect(result.data.timestamp).toBeGreaterThan(0);
        }
    });

    it('should validate event without optional reason', () => {
        // Arrange
        const event = {
            from: 'sprint',
            to: 'vault',
            timestamp: Date.now(),
        };

        // Act
        const result = StateChangeEventSchema.safeParse(event);

        // Assert
        expect(result.success).toBe(true);
    });

    it('should reject event with missing required fields', () => {
        // Arrange
        const invalidEvents = [
            { from: 'walk', timestamp: Date.now() }, // Missing 'to'
            { to: 'sprint', timestamp: Date.now() }, // Missing 'from'
            { from: 'walk', to: 'sprint' }, // Missing 'timestamp'
        ];

        // Act & Assert
        invalidEvents.forEach((event) => {
            const result = StateChangeEventSchema.safeParse(event);
            expect(result.success).toBe(false);
        });
    });

    it('should reject invalid mode types in event', () => {
        // Arrange
        const event = {
            from: 'invalid',
            to: 'sprint',
            timestamp: Date.now(),
        };

        // Act
        const result = StateChangeEventSchema.safeParse(event);

        // Assert
        expect(result.success).toBe(false);
    });

    it('should reject negative or zero timestamps', () => {
        // Arrange
        const events = [
            { from: 'walk', to: 'sprint', timestamp: -1 },
            { from: 'walk', to: 'sprint', timestamp: 0 },
        ];

        // Act & Assert
        events.forEach((event) => {
            const result = StateChangeEventSchema.safeParse(event);
            expect(result.success).toBe(false);
        });
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
            currentMode: 'vault',
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
            expect(result.data.currentMode).toBe('vault');
            expect(result.data.version).toBe(2);
        }
    });

    it('should apply default version if not provided', () => {
        // Arrange
        const state = {
            currentMode: 'walk',
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
            from: 'walk',
            to: 'sprint',
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
            from: 'vault',
            to: 'walk',
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
            from: 'sprint',
            to: 'vault',
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
        const mode: ModeType = 'walk';
        const event: StateChangeEvent = {
            from: 'walk',
            to: 'sprint',
            timestamp: Date.now(),
        };
        const state: ModeState = {
            currentMode: 'vault',
            version: 2,
        };

        // Assert - TypeScript compilation is the test
        expect(mode).toBe('walk');
        expect(event.from).toBe('walk');
        expect(state.currentMode).toBe('vault');
    });
});
