/**
 * @file command.ts
 * @description Command pattern for undo/redo functionality
 */

/**
 * Command interface
 * Implements the Command pattern for undoable actions
 */
export interface Command {
  /**
   * Execute the command
   */
  execute(): void | Promise<void>;

  /**
   * Undo the command (reverse the action)
   */
  undo(): void | Promise<void>;
}

/**
 * Command stack for undo/redo management
 *
 * Features:
 * - Undo last action (Ctrl+Z)
 * - Redo undone action (Ctrl+Shift+Z)
 * - Max stack size (prevents memory bloat)
 * - In-memory only (not persisted)
 *
 * @example
 * ```typescript
 * const stack = new CommandStack();
 * await stack.execute(new CreateHighlightCommand(...));
 * await stack.undo(); // Undoes creation
 * await stack.redo(); // Redoes creation
 * ```
 */
export class CommandStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Execute a command and add to undo stack
   */
  async execute(command: Command): Promise<void> {
    await command.execute();

    this.undoStack.push(command);

    // Trim if exceeds max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift(); // Remove oldest
    }

    // Clear redo stack on new action
    this.redoStack = [];
  }

  /**
   * Undo the last command
   */
  async undo(): Promise<void> {
    const command = this.undoStack.pop();

    if (command) {
      await command.undo();
      this.redoStack.push(command);
    }
  }

  /**
   * Redo the last undone command
   */
  async redo(): Promise<void> {
    const command = this.redoStack.pop();

    if (command) {
      await command.execute();
      this.undoStack.push(command);
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get current stack sizes
   */
  getSize(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length,
    };
  }
}
