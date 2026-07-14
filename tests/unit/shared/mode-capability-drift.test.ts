import { describe, expect, it, vi } from 'vitest';

import { BasicMode } from '@/content/modes/basic-mode';
import { ProMode } from '@/content/modes/pro-mode';
import { ProXaiMode } from '@/content/modes/pro-xai-mode';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import { MODE_CAPABILITY_MATRIX } from '@/shared/utils/mode-capabilities';

function createModeFixtures() {
  const eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
  } as unknown as ILogger;
  const facade = {
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    has: vi.fn(),
    count: vi.fn(),
    findByContentHash: vi.fn(),
    findByUrl: vi.fn(),
    findOverlapping: vi.fn(),
    addMany: vi.fn(),
    initialize: vi.fn(),
    reload: vi.fn(),
  } as unknown as RepositoryFacade;
  const storage = {} as unknown as IStorage;

  return {
    basic: new BasicMode(facade, storage, eventBus, logger),
    pro: new ProMode(facade, eventBus, logger),
    proXai: new ProXaiMode(facade, eventBus, logger),
  };
}

describe('mode capability drift guard', () => {
  it('keeps MODE_CAPABILITY_MATRIX aligned with highlight mode classes', () => {
    const modes = createModeFixtures();

    expect(modes.basic.capabilities).toEqual(MODE_CAPABILITY_MATRIX.basic);
    expect(modes.pro.capabilities).toEqual(MODE_CAPABILITY_MATRIX.pro);
    expect(modes.proXai.capabilities).toEqual(MODE_CAPABILITY_MATRIX.pro_xai);
  });
});
