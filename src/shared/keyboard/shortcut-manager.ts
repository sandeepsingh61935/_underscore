import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { Chord } from './shortcut-chord';
import { matchesEvent } from './shortcut-chord';
import type { ShortcutDefinition } from './shortcut-definitions';
import { SHORTCUT_DEFINITIONS } from './shortcut-definitions';
import type { IShortcutStorage } from './shortcut-storage';
import { getShortcutStorage } from './shortcut-storage';

export type ShortcutActionHandler = (event: KeyboardEvent) => void | Promise<void>;

export class ShortcutManager {
  private resolvedChords: Map<string, Chord> = new Map();
  private secondaryChords: Map<string, Chord> = new Map();
  private handlers: Map<string, Set<ShortcutActionHandler>> = new Map();
  private boundTarget: EventTarget | null = null;
  private unsubscribeStorage: (() => void) | null = null;
  private logger: ILogger;

  constructor(
    private definitions: ShortcutDefinition[] = SHORTCUT_DEFINITIONS,
    private storage: IShortcutStorage = getShortcutStorage(),
    logger?: ILogger
  ) {
    this.logger = logger ?? LoggerFactory.getLogger('ShortcutManager');
    for (const def of this.definitions) {
      if (def.customizable && def.defaultChord) {
        this.resolvedChords.set(def.id, def.defaultChord);
        if (def.secondaryDefaultChord) {
          this.secondaryChords.set(def.id, def.secondaryDefaultChord);
        }
      }
    }
  }

  async init(): Promise<void> {
    await this.refreshResolvedChords();
    this.unsubscribeStorage = this.storage.onChange(() => {
      void this.refreshResolvedChords().then(() => {
        this.logger.debug('Shortcuts updated from storage change');
      });
    });
  }

  async refreshResolvedChords(): Promise<void> {
    const overrides = await this.storage.getOverrides();
    this.resolvedChords.clear();
    this.secondaryChords.clear();

    for (const def of this.definitions) {
      if (!def.customizable) continue;

      const override = overrides[def.id];
      if (override) {
        this.resolvedChords.set(def.id, override);
      } else if (def.defaultChord) {
        this.resolvedChords.set(def.id, def.defaultChord);
        if (def.secondaryDefaultChord) {
          this.secondaryChords.set(def.id, def.secondaryDefaultChord);
        }
      }
    }
  }

  getResolvedChord(id: string): Chord | undefined {
    return this.resolvedChords.get(id);
  }

  getAllResolvedChords(): Record<string, Chord> {
    const result: Record<string, Chord> = {};
    for (const [id, chord] of this.resolvedChords.entries()) {
      result[id] = chord;
    }
    return result;
  }

  on(id: string, handler: ShortcutActionHandler): () => void {
    let set = this.handlers.get(id);
    if (!set) {
      set = new Set();
      this.handlers.set(id, set);
    }
    set.add(handler);

    return () => {
      const current = this.handlers.get(id);
      if (current) {
        current.delete(handler);
        if (current.size === 0) {
          this.handlers.delete(id);
        }
      }
    };
  }

  private handleKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;

    // Check primary resolved chords
    for (const [id, chord] of this.resolvedChords.entries()) {
      if (matchesEvent(chord, event)) {
        const handlers = this.handlers.get(id);
        if (handlers && handlers.size > 0) {
          event.preventDefault();
          this.logger.debug(`Shortcut triggered: ${id}`);
          for (const handler of handlers) {
            try {
              void handler(event);
            } catch (err) {
              this.logger.error(
                `Error executing shortcut handler for ${id}`,
                err as Error
              );
            }
          }
          return;
        }
      }
    }

    // Check secondary default chords (e.g. Ctrl+Y for Redo if Redo has not been customized)
    for (const [id, secondaryChord] of this.secondaryChords.entries()) {
      if (matchesEvent(secondaryChord, event)) {
        const handlers = this.handlers.get(id);
        if (handlers && handlers.size > 0) {
          event.preventDefault();
          this.logger.debug(`Secondary shortcut triggered: ${id}`);
          for (const handler of handlers) {
            try {
              void handler(event);
            } catch (err) {
              this.logger.error(
                `Error executing secondary shortcut handler for ${id}`,
                err as Error
              );
            }
          }
          return;
        }
      }
    }
  };

  bind(target: EventTarget = document): void {
    if (this.boundTarget) {
      this.unbind();
    }
    this.boundTarget = target;
    target.addEventListener('keydown', this.handleKeyDown);
    this.logger.debug('ShortcutManager bound to target');
  }

  unbind(): void {
    if (this.boundTarget) {
      this.boundTarget.removeEventListener('keydown', this.handleKeyDown);
      this.boundTarget = null;
      this.logger.debug('ShortcutManager unbound from target');
    }
  }

  destroy(): void {
    this.unbind();
    if (this.unsubscribeStorage) {
      this.unsubscribeStorage();
      this.unsubscribeStorage = null;
    }
    this.handlers.clear();
    this.resolvedChords.clear();
    this.secondaryChords.clear();
  }
}

let sharedShortcutManager: ShortcutManager | null = null;

export function getSharedShortcutManager(): ShortcutManager {
  if (!sharedShortcutManager) {
    sharedShortcutManager = new ShortcutManager();
  }
  return sharedShortcutManager;
}
