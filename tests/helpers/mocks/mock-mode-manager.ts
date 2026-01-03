/**
 * @file mock-mode-manager.ts
 * @description Mock implementation of IModeManager for testing
 */

import { vi } from 'vitest';

import type {
  IHighlightMode,
  HighlightData,
} from '@/content/modes/highlight-mode.interface';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';

export class MockModeManager implements IModeManager {
  currentModeName: string = 'walk'; // Default

  // Mocks/Spies
  registerModeSpy = vi.fn();
  activateModeSpy = vi.fn();
  getCurrentModeSpy = vi.fn();
  createHighlightSpy = vi.fn().mockResolvedValue('mock-id');
  createFromDataSpy = vi.fn().mockResolvedValue(undefined);
  removeHighlightSpy = vi.fn().mockResolvedValue(undefined);
  restoreSpy = vi.fn().mockResolvedValue(undefined);
  getHighlightSpy = vi.fn().mockReturnValue(null);

  // Helper to simulate mode return
  mockCurrentMode: IHighlightMode = {
    name: 'walk',
    capabilities: { persistence: 'none' },
    createHighlight: vi.fn(),
    createFromData: vi.fn(),
    updateHighlight: vi.fn(),
    removeHighlight: vi.fn(),
    getHighlight: vi.fn(),
    clearAll: vi.fn(),
    onActivate: vi.fn(),
    onDeactivate: vi.fn(),
    onHighlightCreated: vi.fn(),
    onHighlightRemoved: vi.fn(),
    shouldRestore: () => false,
  } as unknown as IHighlightMode;

  registerMode(mode: IHighlightMode): void {
    this.registerModeSpy(mode);
  }

  async activateMode(modeName: string): Promise<void> {
    this.activateModeSpy(modeName);
    this.currentModeName = modeName;
    // Update mock mode name to match for consistency
    // (In real tests, you might swap the whole mockCurrentMode object)
    if (this.mockCurrentMode) {
      (this.mockCurrentMode as any).name = modeName;
    }
  }

  getCurrentMode(): IHighlightMode {
    this.getCurrentModeSpy();
    return this.mockCurrentMode;
  }

  async createHighlight(selection: Selection, color: string): Promise<string> {
    this.createHighlightSpy(selection, color);
    return 'mock-id-' + Date.now();
  }

  async createFromData(data: HighlightData): Promise<void> {
    this.createFromDataSpy(data);
  }

  async removeHighlight(id: string): Promise<void> {
    this.removeHighlightSpy(id);
  }

  async restore(url: string): Promise<void> {
    this.restoreSpy(url);
  }

  getHighlight(id: string): HighlightData | null {
    this.getHighlightSpy(id);
    return null;
  }
}
