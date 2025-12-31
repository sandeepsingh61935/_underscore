/**
 * @file command-flow.integration.test.ts
 * @description Integration tests for Command Pattern flows across modes
 * @see Phase 1.1.5: Integration Testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container } from '@/shared/di/container';
import { registerServices } from '@/shared/di/service-registration';
import { CommandStack } from '@/shared/patterns/command';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { ILogger } from '@/shared/utils/logger';
import { RepositoryFactory } from '@/shared/repositories';
import { CreateHighlightCommand, RemoveHighlightCommand } from '@/content/commands/simple-highlight-commands';

// Mock DOM dependencies
vi.mock('@/content/utils/range-converter', () => ({
    serializeRange: vi.fn().mockReturnValue({
        xpath: '/html/body/div[1]',
        startOffset: 0,
        endOffset: 5,
        text: 'test'
    }),
    deserializeRange: vi.fn().mockReturnValue(document.createRange())
}));

describe('Command Flow Integration', () => {
    let container: Container;
    let modeManager: IModeManager;
    let logger: ILogger;
    let commandStack: CommandStack;

    beforeEach(async () => {
        // Setup DI Container
        container = new Container();
        registerServices(container);

        // Resolve dependencies
        modeManager = container.resolve<IModeManager>('modeManager');
        logger = container.resolve<ILogger>('logger');

        // Register Modes (Integration: Use REAL modes)
        const walkMode = container.resolve('walkMode');
        const sprintMode = container.resolve('sprintMode');
        modeManager.registerMode(walkMode as any);
        modeManager.registerMode(sprintMode as any);

        // Mock crypto
        Object.defineProperty(global, 'crypto', {
            value: {
                randomUUID: () => 'uuid-' + Math.random().toString(36).substr(2, 9),
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
                }
            },
            writable: true
        });

        // Mock CSS Highlight API
        global.Highlight = class MockHighlight {
            constructor(..._ranges: Range[]) { }
        } as any;

        (global as any).CSS = {
            highlights: new Map(),
            supports: () => true
        };

        // Setup Command Stack
        commandStack = new CommandStack(50);

        // Setup DOM
        document.body.innerHTML = '<div>test content</div>';
    });

    afterEach(() => {
        vi.clearAllMocks();
        RepositoryFactory.reset();
    });

    /**
     * Helper: Create mock selection
     */
    function createSelection(): Selection {
        const range = document.createRange();
        const node = document.body.firstChild!;
        range.selectNode(node);

        const selection = {
            rangeCount: 1,
            getRangeAt: () => range,
            removeAllRanges: vi.fn(),
            addRange: vi.fn()
        } as unknown as Selection;

        return selection;
    }

    describe('Walk Mode (Ephemeral)', () => {
        it('should create, undo, and redo highlights without persistence', async () => {
            // 1. Activate Walk Mode
            await modeManager.activateMode('walk');
            const walkMode = modeManager.getCurrentMode();
            expect(walkMode.name).toBe('walk');

            // 2. Execute Create Command
            const selection = createSelection();
            const createCmd = new CreateHighlightCommand(
                selection,
                'yellow',
                modeManager,
                logger
            );

            await commandStack.execute(createCmd);

            // Verify creation
            expect(walkMode.getAllHighlights()).toHaveLength(1);
            const hlId = walkMode.getAllHighlights()[0]?.id;
            if (!hlId) throw new Error('Highlight not created');

            // 3. Undo
            await commandStack.undo();
            expect(walkMode.getAllHighlights()).toHaveLength(0);

            // 4. Redo
            await commandStack.redo();
            expect(walkMode.getAllHighlights()).toHaveLength(1);
            expect(walkMode.getHighlight(hlId)).toBeDefined();
        });
    });

    describe('Sprint Mode (Local Persistence)', () => {
        it('should create and store highlights locally', async () => {
            // 1. Activate Sprint Mode
            await modeManager.activateMode('sprint');
            const sprintMode = modeManager.getCurrentMode();

            // 2. Execute Create
            const selection = createSelection();
            const createCmd = new CreateHighlightCommand(
                selection,
                'green',
                modeManager,
                logger
            );

            await commandStack.execute(createCmd);
            const highlights = sprintMode.getAllHighlights();
            expect(highlights).toHaveLength(1);
            const hlId = highlights[0]?.id;
            if (!hlId) throw new Error('Highlight not created');

            // 3. Execute Remove
            const removeCmd = new RemoveHighlightCommand(
                hlId,
                modeManager,
                logger
            );
            await commandStack.execute(removeCmd);
            expect(sprintMode.getAllHighlights()).toHaveLength(0);

            // 4. Undo Remove (Restore)
            await commandStack.undo();
            expect(sprintMode.getAllHighlights()).toHaveLength(1);
            expect(sprintMode.getHighlight(hlId)?.colorRole).toBe('green');
        });
    });

    describe('Command Stack Behavior', () => {
        it('should limit stack size and drop oldest commands', async () => {
            const smallStack = new CommandStack(2);
            await modeManager.activateMode('walk');

            // Excecute 3 commands
            for (let i = 0; i < 3; i++) {
                const cmd = new CreateHighlightCommand(
                    createSelection(),
                    'yellow',
                    modeManager,
                    logger
                );
                await smallStack.execute(cmd);
            }

            // Should behave as size 2: 
            // 3rd executed (top), 2nd executed (bottom). 1st dropped.

            // Undo 1 (2nd command)
            expect(smallStack.canUndo()).toBe(true);
            await smallStack.undo();

            // Undo 2 (1st command)
            expect(smallStack.canUndo()).toBe(true);
            await smallStack.undo();

            // Undo 3 (Should fail/be empty)
            expect(smallStack.canUndo()).toBe(false);
        });

        it('should clear redo stack on new execution', async () => {
            await modeManager.activateMode('walk');
            const cmd1 = new CreateHighlightCommand(createSelection(), 'red', modeManager, logger);
            const cmd2 = new CreateHighlightCommand(createSelection(), 'blue', modeManager, logger);

            await commandStack.execute(cmd1);
            await commandStack.undo(); // Stack: [empty], Redo: [cmd1]

            expect(commandStack.canRedo()).toBe(true);

            await commandStack.execute(cmd2); // Stack: [cmd2], Redo: [empty]

            expect(commandStack.canRedo()).toBe(false);
        });
    });

    it('should handle mode errors gracefully without crashing stack', async () => {
        await modeManager.activateMode('walk');

        // Spy on mode to throw error
        const walkMode = modeManager.getCurrentMode();
        vi.spyOn(walkMode, 'createHighlight').mockRejectedValue(new Error('Simulated Failure'));

        const cmd = new CreateHighlightCommand(
            createSelection(),
            'yellow',
            modeManager,
            logger
        );

        // Should throw but stack should remain consistent
        await expect(commandStack.execute(cmd)).rejects.toThrow('Simulated Failure');
    });
});
