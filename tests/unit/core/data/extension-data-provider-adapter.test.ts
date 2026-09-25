import { describe, it, expect, vi } from 'vitest';
import { ExtensionDataProviderAdapter } from '@/core/data/ExtensionDataProviderAdapter';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

describe('ExtensionDataProviderAdapter', () => {
  it('returns empty collections when no messageBus is injected', async () => {
    const logger = new ConsoleLogger('test', LogLevel.NONE);
    const eventBus = new EventBus(logger);
    const adapter = new ExtensionDataProviderAdapter(eventBus);

    const collections = await adapter.getCollections('cloud');
    expect(collections).toEqual([]);
  });

  it('sends GET_COLLECTIONS IPC and maps the response to DomainCollection[]', async () => {
    const send = vi.fn(async () => ({
      success: true,
      data: {
        collections: [
          { domain: 'example.com', highlightCount: 3, mode: 'ephemeral' },
          { domain: 'other.com', highlightCount: 1, mode: 'ephemeral' },
        ],
      },
    }));
    const messageBus = { send } as unknown as IMessageBus;
    const adapter = new ExtensionDataProviderAdapter(
      new EventBus(new ConsoleLogger('test', LogLevel.NONE)),
      messageBus
    );

    const collections = await adapter.getCollections('ephemeral');

    expect(send).toHaveBeenCalledWith(
      'background',
      expect.objectContaining({
        type: 'GET_COLLECTIONS',
        payload: { mode: 'ephemeral' },
      })
    );
    expect(collections).toEqual([
      { id: 'example.com', domain: 'example.com', highlightCount: 3 },
      { id: 'other.com', domain: 'other.com', highlightCount: 1 },
    ]);
  });

  it('throws when IPC response is unsuccessful (caller keeps cached list)', async () => {
    const send = vi.fn(async () => ({ success: false, error: 'boom' }));
    const messageBus = { send } as unknown as IMessageBus;
    const adapter = new ExtensionDataProviderAdapter(
      new EventBus(new ConsoleLogger('test', LogLevel.NONE)),
      messageBus
    );

    await expect(adapter.getCollections('ephemeral')).rejects.toThrow('boom');
  });

  it('throws when IPC throws (caller keeps cached list)', async () => {
    const send = vi.fn(async () => {
      throw new Error('IPC down');
    });
    const messageBus = { send } as unknown as IMessageBus;
    const adapter = new ExtensionDataProviderAdapter(
      new EventBus(new ConsoleLogger('test', LogLevel.NONE)),
      messageBus
    );

    await expect(adapter.getCollections('ephemeral')).rejects.toThrow('IPC down');
  });
});
