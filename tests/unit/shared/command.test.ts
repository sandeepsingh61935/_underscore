/**
 * @file command.test.ts
 * @description Tests for command pattern
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { CommandStack, type Command } from '@/shared/patterns/command';

// Mock command for testing
class MockCommand implements Command {
    public executeCount = 0;
    public undoCount = 0;

    async execute() {
        this.executeCount++;
    }

    async undo() {
        this.undoCount++;
    }
}

describe('CommandStack', () => {
    let stack: CommandStack;

    beforeEach(() => {
        stack = new CommandStack();
    });

    describe('execute', () => {
        it('should execute command and add to undo stack', async () => {
            const cmd = new MockCommand();
            await stack.execute(cmd);

            expect(cmd.executeCount).toBe(1);
            expect(stack.canUndo()).toBe(true);
            expect(stack.canRedo()).toBe(false);
        });

        it('should clear redo stack on new action', async () => {
            const cmd1 = new MockCommand();
            const cmd2 = new MockCommand();

            await stack.execute(cmd1);
            await stack.undo();
            expect(stack.canRedo()).toBe(true);

            // New action clears redo
            await stack.execute(cmd2);
            expect(stack.canRedo()).toBe(false);
        });

        it('should respect max stack size', async () => {
            const smallStack = new CommandStack(3);

            for (let i = 0; i < 5; i++) {
                await smallStack.execute(new MockCommand());
            }

            expect(smallStack.getSize().undo).toBe(3);
        });
    });

    describe('undo', () => {
        it('should undo last command', async () => {
            const cmd = new MockCommand();
            await stack.execute(cmd);
            await stack.undo();

            expect(cmd.undoCount).toBe(1);
            expect(stack.canUndo()).toBe(false);
            expect(stack.canRedo()).toBe(true);
        });

        it('should handle empty stack', async () => {
            await stack.undo(); // Should not throw
            expect(stack.canUndo()).toBe(false);
        });
    });

    describe('redo', () => {
        it('should redo undone command', async () => {
            const cmd = new MockCommand();
            await stack.execute(cmd);
            await stack.undo();
            await stack.redo();

            expect(cmd.executeCount).toBe(2);
            expect(stack.canUndo()).toBe(true);
            expect(stack.canRedo()).toBe(false);
        });

        it('should handle empty redo stack', async () => {
            await stack.redo(); // Should not throw
            expect(stack.canRedo()).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all stacks', async () => {
            await stack.execute(new MockCommand());
            await stack.execute(new MockCommand());
            await stack.undo();

            stack.clear();

            expect(stack.canUndo()).toBe(false);
            expect(stack.canRedo()).toBe(false);
            expect(stack.getSize()).toEqual({ undo: 0, redo: 0 });
        });
    });
});
