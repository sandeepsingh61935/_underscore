/**
 * @file ipc-readable-highlight-repository.ts
 * @description Read-side IPC adapter for the content script.
 *
 * restore / Pro hydrate pull persisted highlights from the background after
 * page reload (local cache is empty). Uses shared IPC retry for cold SW.
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { sendBackgroundIpcWithRetry } from '@/shared/messaging/send-background-ipc-with-retry';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { LoggerFactory } from '@/shared/utils/logger';

export class IpcReadableHighlightRepository implements IReadableHighlightRepository {
  private readonly logger = LoggerFactory.getLogger('IpcReadableHighlightRepository');

  constructor(
    private readonly messageBus: IMessageBus,
    private readonly getMode: () => ModeType
  ) {}

  async findByUrl(url: string): Promise<HighlightDataV2[]> {
    const mode = this.getMode();
    try {
      const res = await sendBackgroundIpcWithRetry<{
        success: boolean;
        data?: HighlightDataV2[];
        error?: string;
      }>(
        this.messageBus,
        {
          type: 'IPC_HIGHLIGHTS_FIND_BY_URL',
          payload: { url, mode },
          timestamp: Date.now(),
        },
        { onExhausted: 'throw' }
      );

      if (!res?.success || !res.data) {
        throw new Error(res?.error ?? 'IPC_HIGHLIGHTS_FIND_BY_URL failed');
      }
      return res.data;
    } catch (err) {
      this.logger.warn('IPC findByUrl failed after retries', {
        url,
        mode,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  async findById(_id: string): Promise<HighlightDataV2 | null> {
    throw new Error('findById not supported via read IPC adapter; use RepositoryFacade');
  }
  async findAll(): Promise<HighlightDataV2[]> {
    throw new Error('findAll not supported via read IPC adapter; use RepositoryFacade');
  }
  async count(): Promise<number> {
    throw new Error('count not supported via read IPC adapter; use RepositoryFacade');
  }
  async exists(_id: string): Promise<boolean> {
    throw new Error('exists not supported via read IPC adapter; use RepositoryFacade');
  }
  async findByContentHash(_hash: string): Promise<HighlightDataV2 | null> {
    throw new Error(
      'findByContentHash not supported via read IPC adapter; use RepositoryFacade'
    );
  }
  async findOverlapping(_range: SerializedRange): Promise<HighlightDataV2[]> {
    throw new Error(
      'findOverlapping not supported via read IPC adapter; use RepositoryFacade'
    );
  }
  async clear(): Promise<void> {
    throw new Error('clear not supported via read IPC adapter; use RepositoryFacade');
  }
}
