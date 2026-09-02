/**
 * @file command-flow.integration.test.ts
 * @description Integration tests for Command Pattern flows across modes
 * @see Phase 1.1.5: Integration Testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  CreateHighlightCommand,
  RemoveHighlightCommand,
} from '@/content/commands/simple-highlight-commands';
import { Container } from '@/shared/di/container';
import { registerServices } from '@/shared/di/service-registration';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import { CommandStack } from '@/shared/patterns/command';
import { RepositoryFactory } from '@/shared/repositories';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { ILogger } from '@/shared/utils/logger';

// Mock DOM dependencies
vi.mock('@/content/utils/range-converter', () => ({
  serializeRange: vi.fn().mockReturnValue({
    xpath: '/html/body/div[1]',
    startOffset: 0,
    endOffset: 5,
    text: 'test',
  }),
  deserializeRange: vi.fn().mockReturnValue(document.createRange()),
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
    const basicMode = container.resolve('basicMode');
    const proMode = container.resolve('proMode');
    modeManager.registerMode(basicMode as any);
    modeManager.registerMode(proMode as any);

    // Initialize RepositoryFacade (required for modes to function)
    const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
    await repositoryFacade.initialize();

    // Mock crypto
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'uuid-' + Math.random().toString(36).substr(2, 9),
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        },
      },
      writable: true,
    });

    // Mock CSS Highlight API
    global.Highlight = class MockHighlight {
      constructor(..._ranges: Range[]) {}
      add(_range: Range): void {}
      has(_range: Range): boolean {
        return true;
      }
      delete(_range: Range): void {}
      clear(): void {}
    } as any;

    (global as any).CSS = {
      highlights: new Map(),
      supports: () => true,
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
      addRange: vi.fn(),
    } as unknown as Selection;

    return selection;
  }

  describe('Basic Mode', () => {
    it('should create, undo, and redo highlights without persistence', async () => {
      // 1. Activate Basic Mode
      await modeManager.activateMode('basic');
      const basicMode = modeManager.getCurrentMode();
      expect(basicMode.name).toBe('basic');

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
      expect(basicMode.getAllHighlights()).toHaveLength(1);
      const hlId = basicMode.getAllHighlights()[0]?.id;
      if (!hlId) throw new Error('Highlight not created');

      // 3. Undo
      await commandStack.undo();
      expect(basicMode.getAllHighlights()).toHaveLength(0);

      // 4. Redo
      await commandStack.redo();
      expect(basicMode.getAllHighlights()).toHaveLength(1);
      expect(basicMode.getHighlight(hlId)).toBeDefined();
    });
  });

  describe('Pro Mode (Persistent)', () => {
    it('should create and store highlights locally', async () => {
      // 1. Activate Pro Mode
      await modeManager.activateMode('pro');
      const proMode = modeManager.getCurrentMode();

      // 2. Execute Create
      const selection = createSelection();
      const createCmd = new CreateHighlightCommand(
        selection,
        'green',
        modeManager,
        logger
      );

      await commandStack.execute(createCmd);
      const highlights = proMode.getAllHighlights();
      expect(highlights).toHaveLength(1);
      const hlId = highlights[0]?.id;
      if (!hlId) throw new Error('Highlight not created');

      // 3. Execute Remove
      const removeCmd = new RemoveHighlightCommand(hlId, modeManager, logger);
      await commandStack.execute(removeCmd);
      expect(proMode.getAllHighlights()).toHaveLength(0);

      // 4. Undo Remove (Restore)
      await commandStack.undo();
      expect(proMode.getAllHighlights()).toHaveLength(1);
      expect(proMode.getHighlight(hlId)?.colorRole).toBe('yellow');
    });
  });

  describe('Command Stack Behavior', () => {
    it('should limit stack size and drop oldest commands', async () => {
      const smallStack = new CommandStack(2);
      await modeManager.activateMode('basic');

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
      await modeManager.activateMode('basic');
      const cmd1 = new CreateHighlightCommand(
        createSelection(),
        'red',
        modeManager,
        logger
      );
      const cmd2 = new CreateHighlightCommand(
        createSelection(),
        'blue',
        modeManager,
        logger
      );

      await commandStack.execute(cmd1);
      await commandStack.undo(); // Stack: [empty], Redo: [cmd1]

      expect(commandStack.canRedo()).toBe(true);

      await commandStack.execute(cmd2); // Stack: [cmd2], Redo: [empty]

      expect(commandStack.canRedo()).toBe(false);
    });
  });

  it('should handle mode errors gracefully without crashing stack', async () => {
    await modeManager.activateMode('basic');

    // Spy on mode to throw error
    const basicMode = modeManager.getCurrentMode();
    vi.spyOn(basicMode, 'createHighlight').mockRejectedValue(
      new Error('Simulated Failure')
    );

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
