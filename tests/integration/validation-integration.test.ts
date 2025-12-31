/**
 * @file validation-integration.test.ts
 * @description Integration tests for validation layer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModeManager } from '@/content/modes/mode-manager';
import { StorageService } from '@/shared/services/storage-service';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory, LogLevel } from '@/shared/utils/logger';
import { ValidationError } from '@/shared/errors/app-error';
import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';

describe('Validation Integration (8 tests)', () => {

    describe('ModeManager Validation', () => {
        let modeManager: ModeManager;
        let eventBus: EventBus;

        beforeEach(() => {
            eventBus = new EventBus();
            const logger = LoggerFactory.getLogger('test');
            logger.setLevel(LogLevel.NONE); // Suppress logs during tests
            modeManager = new ModeManager(eventBus, logger);

            // Register a mock mode
            const mockMode: IHighlightMode = {
                name: 'walk',
                type: 'ephemeral',
                onActivate: async () => { },
                onDeactivate: async () => { },
                createHighlight: async () => 'test-id',
                removeHighlight: async () => { },
                createFromData: async () => { },
            };
            modeManager.registerMode(mockMode);
        });

        it('1. accepts valid mode names', async () => {
            await expect(modeManager.activateMode('walk')).resolves.not.toThrow();
        });

        it('2. rejects invalid mode name (not in enum)', async () => {
            await expect(
                modeManager.activateMode('invalid-mode' as any)
            ).rejects.toThrow(ValidationError);
        });

        it('3. provides context in validation error', async () => {
            try {
                await modeManager.activateMode('bad-mode' as any);
                expect.fail('Should have thrown ValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                expect((error as ValidationError).context).toHaveProperty('modeName');
                expect((error as ValidationError).context?.modeName).toBe('bad-mode');
            }
        });

        it('4. includes Zod issues in error context', async () => {
            try {
                await modeManager.activateMode('xyz' as any);
            } catch (error) {
                expect((error as ValidationError).context).toHaveProperty('validationIssues');
            }
        });
    });

    describe('StorageService Validation', () => {
        let storage: StorageService;

        beforeEach(() => {
            storage = new StorageService();
        });

        it('5. accepts valid highlight event', async () => {
            const validEvent = {
                type: 'highlight.created' as const,
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: {
                    version: 2,
                    id: crypto.randomUUID(),
                    text: 'test',
                    contentHash: 'a'.repeat(64),
                    colorRole: 'yellow' as const,
                    type: 'underscore' as const,
                    ranges: [{
                        xpath: '/div',
                        startOffset: 0,
                        endOffset: 4,
                        text: 'test',
                        textBefore: '',
                        textAfter: ''
                    }],
                    createdAt: new Date()
                }
            };

            await expect(storage.saveEvent(validEvent)).resolves.not.toThrow();
        });

        it('6. rejects event with missing required fields', async () => {
            const invalidEvent = {
                type: 'highlight.created',
                // Missing timestamp, eventId, data
            } as any;

            await expect(storage.saveEvent(invalidEvent)).rejects.toThrow(ValidationError);
        });

        it('7. rejects event with invalid data structure', async () => {
            const invalidEvent = {
                type: 'highlight.created' as const,
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: {
                    // Missing required fields
                    id: 'bad-id',
                    text: 'incomplete'
                }
            } as any;

            await expect(storage.saveEvent(invalidEvent)).rejects.toThrow(ValidationError);
        });

        it('8. provides descriptive error message', async () => {
            const invalidEvent = { type: 'bad-type' } as any;

            try {
                await storage.saveEvent(invalidEvent);
                expect.fail('Should have thrown ValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                expect((error as ValidationError).message).toContain('Invalid highlight event');
            }
        });
    });
});
