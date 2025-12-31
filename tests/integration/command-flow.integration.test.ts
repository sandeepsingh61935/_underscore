import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Container } from '@/shared/di/container';
import { registerServices } from '@/shared/di/service-registration';
import { CommandStack } from '@/shared/patterns/command';
import { CreateHighlightCommand, RemoveHighlightCommand } from '@/content/commands/simple-highlight-commands';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { ILogger } from '@/shared/utils/logger';
import { RepositoryFactory } from '@/shared/repositories';

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
        // We need to resolve them as any to access registerMode if it's not on IModeManager (it is)
        // But container returns them as typed classes
        const walkMode = container.resolve('walkMode');
        const sprintMode = container.resolve('sprintMode');

        modeManager.registerMode(walkMode as any);
        modeManager.registerMode(sprintMode as any);

        // Mock crypto for ID generation and hashing
        Object.defineProperty(global, 'crypto', {
            value: {
                randomUUID: () => 'uuid-' + Math.random().toString(36).substr(2, 9),
                subtle: {
                    digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
                }
            },
            writable: true
        });

        // Mock CSS Highlight API (Not supported in JSDOM)
        global.Highlight = class MockHighlight {
            constructor(..._ranges: Range[]) { }
        } as any;

        (global as any).CSS = {
            highlights: new Map(),
            supports: () => true
        };

        // Setup Command Stack
        commandStack = new CommandStack(50);

        // Setup DOM for Range
        document.body.innerHTML = '<div>test content</div>';
    });

    afterEach(() => {
        vi.clearAllMocks();
        RepositoryFactory.reset(); // Reset global state if any
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
});
