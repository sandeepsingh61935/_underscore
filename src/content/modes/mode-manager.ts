/**
 * Mode Manager
 *
 * Coordinates mode switching and delegates operations
 */

import type { IHighlightMode, HighlightData } from './highlight-mode.interface';

import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class ModeManager {
  private currentMode: IHighlightMode | null = null;
  private modes = new Map<string, IHighlightMode>();

  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: ILogger
  ) {}

  registerMode(mode: IHighlightMode): void {
    this.modes.set(mode.name, mode);
    this.logger.info(`Mode registered: ${mode.name}`);
  }

  async activateMode(modeName: string): Promise<void> {
    const newMode = this.modes.get(modeName);
    if (!newMode) {
      throw new Error(`Mode ${modeName} not registered`);
    }

    if (this.currentMode === newMode) {
      this.logger.debug(`Already in ${modeName} mode`);
      return;
    }

    // Deactivate current
    if (this.currentMode) {
      this.logger.info(`Deactivating ${this.currentMode.name} mode`);
      await this.currentMode.onDeactivate();
    }

    // Activate new
    this.currentMode = newMode;
    await this.currentMode.onActivate();

    this.eventBus.emit('mode:switched', { mode: modeName });
    this.logger.info(`Activated ${modeName} mode`);
  }

  getCurrentMode(): IHighlightMode {
    if (!this.currentMode) {
      throw new Error('No mode activated');
    }
    return this.currentMode;
  }

  // Delegate methods (convenience)
  async createHighlight(selection: Selection, color: string): Promise<string> {
    return await this.getCurrentMode().createHighlight(selection, color);
  }

  async createFromData(data: HighlightData): Promise<void> {
    return await this.getCurrentMode().createFromData(data);
  }

  async removeHighlight(id: string): Promise<void> {
    return await this.getCurrentMode().removeHighlight(id);
  }

  async restore(url: string): Promise<void> {
    return await this.getCurrentMode().restore(url);
  }

  getHighlight(id: string): HighlightData | null {
    return this.getCurrentMode().getHighlight(id);
  }
}
