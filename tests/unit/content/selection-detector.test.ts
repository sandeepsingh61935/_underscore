/**
 * @file selection-detector.test.ts
 * @description Unit tests for SelectionDetector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SelectionDetector } from '@/content/selection-detector';
import { EventBus } from '@/shared/utils/event-bus';
import { EventName } from '@/shared/types/events';

describe('SelectionDetector', () => {
    let detector: SelectionDetector;
    let eventBus: EventBus;
    let emitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        eventBus = new EventBus();
        emitSpy = vi.spyOn(eventBus, 'emit');
        detector = new SelectionDetector(eventBus);
    });

    afterEach(() => {
        if (detector.isInitialized()) {
            detector.destroy();
        }
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize successfully', () => {
            detector.init();
            expect(detector.isInitialized()).toBe(true);
        });

        it('should not initialize twice', () => {
            detector.init();
            detector.init(); // Second call
            expect(detector.isInitialized()).toBe(true);
        });

        it('should clean up on destroy', () => {
            detector.init();
            detector.destroy();
            expect(detector.isInitialized()).toBe(false);
        });
    });

    describe('Double-Click Detection', () => {
        beforeEach(() => {
            detector.init();
        });

        it('should detect double-click within threshold', () => {
            // Mock selection
            const mockSelection = {
                isCollapsed: false,
                toString: () => 'selected text',
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            // Simulate two clicks within 300ms
            const mouseUpEvent = new MouseEvent('mouseup');

            document.dispatchEvent(mouseUpEvent); // First click
            document.dispatchEvent(mouseUpEvent); // Second click (immediately)

            expect(emitSpy).toHaveBeenCalledWith(
                EventName.SELECTION_CREATED,
                expect.objectContaining({
                    type: EventName.SELECTION_CREATED,
                })
            );

            vi.unstubAllGlobals();
        });

        it('should not emit event for clicks outside threshold', async () => {
            const mockSelection = {
                isCollapsed: false,
                toString: () => 'selected text',
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const mouseUpEvent = new MouseEvent('mouseup');

            document.dispatchEvent(mouseUpEvent); // First click

            // Wait longer than threshold (300ms)
            await new Promise(resolve => setTimeout(resolve, 350));

            document.dispatchEvent(mouseUpEvent); // Second click (too late)

            expect(emitSpy).not.toHaveBeenCalled();

            vi.unstubAllGlobals();
        });
    });

    describe('Keyboard Shortcut Detection', () => {
        beforeEach(() => {
            detector.init();
        });

        it('should detect Ctrl+U shortcut', () => {
            const mockSelection = {
                isCollapsed: false,
                toString: () => 'selected text',
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const keyEvent = new KeyboardEvent('keydown', {
                key: 'u',
                ctrlKey: true,
            });

            const preventDefaultSpy = vi.spyOn(keyEvent, 'preventDefault');
            document.dispatchEvent(keyEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(emitSpy).toHaveBeenCalledWith(
                EventName.SELECTION_CREATED,
                expect.any(Object)
            );

            vi.unstubAllGlobals();
        });

        it('should detect Cmd+U shortcut (Mac)', () => {
            const mockSelection = {
                isCollapsed: false,
                toString: () => 'selected text',
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const keyEvent = new KeyboardEvent('keydown', {
                key: 'u',
                metaKey: true, // Cmd key on Mac
            });

            document.dispatchEvent(keyEvent);

            expect(emitSpy).toHaveBeenCalled();

            vi.unstubAllGlobals();
        });

        it('should not trigger on Ctrl+Shift+U', () => {
            const mockSelection = {
                isCollapsed: false,
                toString: () => 'selected text',
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const keyEvent = new KeyboardEvent('keydown', {
                key: 'u',
                ctrlKey: true,
                shiftKey: true, // Shift key pressed
            });

            document.dispatchEvent(keyEvent);

            expect(emitSpy).not.toHaveBeenCalled();

            vi.unstubAllGlobals();
        });
    });

    describe('Selection Validation', () => {
        beforeEach(() => {
            detector.init();
        });

        it('should not emit for empty selection', () => {
            const mockSelection = {
                isCollapsed: false,
                toString: () => '', // Empty
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const mouseUpEvent = new MouseEvent('mouseup');
            document.dispatchEvent(mouseUpEvent);
            document.dispatchEvent(mouseUpEvent); // Double-click

            expect(emitSpy).not.toHaveBeenCalled();

            vi.unstubAllGlobals();
        });

        it('should not emit for collapsed selection (cursor only)', () => {
            const mockSelection = {
                isCollapsed: true, // Just a cursor
                toString: () => 'text',
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const mouseUpEvent = new MouseEvent('mouseup');
            document.dispatchEvent(mouseUpEvent);
            document.dispatchEvent(mouseUpEvent); // Double-click

            expect(emitSpy).not.toHaveBeenCalled();

            vi.unstubAllGlobals();
        });

        it('should not emit for whitespace-only selection', () => {
            const mockSelection = {
                isCollapsed: false,
                toString: () => '   \n\t  ', // Whitespace only
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const mouseUpEvent = new MouseEvent('mouseup');
            document.dispatchEvent(mouseUpEvent);
            document.dispatchEvent(mouseUpEvent); // Double-click

            expect(emitSpy).not.toHaveBeenCalled();

            vi.unstubAllGlobals();
        });

        it('should emit for valid text selection', () => {
            const mockSelection = {
                isCollapsed: false,
                toString: () => 'valid selection text',
                rangeCount: 1,
            };
            vi.stubGlobal('getSelection', () => mockSelection);

            const mouseUpEvent = new MouseEvent('mouseup');
            document.dispatchEvent(mouseUpEvent);
            document.dispatchEvent(mouseUpEvent); // Double-click

            expect(emitSpy).toHaveBeenCalled();

            vi.unstubAllGlobals();
        });
    });
});
