import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient as SupabaseSDKClient,
} from '@supabase/supabase-js';

import type { IWebSocketClient } from './interfaces/i-websocket-client';

import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';
import {
  isGroupRowSoftDeleted,
  type SupabaseGroupItemRow,
  type SupabaseGroupRow,
} from '@/shared/utils/supabase-group-row';
import {
  isHighlightRowSoftDeleted,
  transformHighlightRow,
  type SupabaseHighlightRow,
} from '@/shared/utils/supabase-highlight-row';

type GroupTable = 'page_groups' | 'page_group_items';

/**
 * WebSocket client for real-time synchronization
 * Adapts Supabase Realtime to internal EventBus
 */
export class WebSocketClient implements IWebSocketClient {
  private channel?: RealtimeChannel;
  private groupsChannel?: RealtimeChannel;
  private currentUserId?: string;

  constructor(
    private readonly supabase: SupabaseSDKClient,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  /**
   * Subscribe to real-time updates for a specific user
   */
  async subscribe(userId: string): Promise<void> {
    if (this.currentUserId === userId && this.isConnected()) {
      this.logger.debug('Already subscribed to user channel', { userId });
      return;
    }

    // Unsubscribe if existing connection exists
    if (this.channel) {
      this.unsubscribe();
    }

    this.currentUserId = userId;
    this.logger.info('Subscribing to realtime updates', { userId });

    try {
      // Use Supabase SDK client directly
      if (!this.supabase || typeof this.supabase.channel !== 'function') {
        this.logger.error(
          'Supabase SDK client invalid or missing channel method',
          undefined,
          {
            keys: this.supabase ? Object.keys(this.supabase) : [],
          }
        );
        return;
      }

      // CRITICAL: Get the access token from the current session
      // Supabase Realtime requires the JWT token to authenticate the WebSocket connection
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      // Check if unsubscribed or switched user while waiting for session
      if (this.currentUserId !== userId) {
        this.logger.info(
          'Subscription aborted: user changed or unsubscribed during authentication'
        );
        return;
      }

      if (!session || !session.access_token) {
        this.logger.error(
          'Cannot subscribe to realtime: No active session or access token'
        );
        throw new Error('No active session for realtime subscription');
      }

      this.logger.info('[WebSocketClient] Setting access token for realtime channel', {
        userId,
        tokenLength: session.access_token.length,
      });

      // Set the access token on the Supabase client for Realtime auth
      // This is essential for Supabase to recognize the WebSocket connection as authenticated
      this.supabase.realtime.setAuth(session.access_token);

      this.channel = this.supabase
        .channel('highlights-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'highlights',
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<SupabaseHighlightRow>) =>
            this.handleChange(payload)
        )
        .subscribe((status: string, err?: Error) => {
          this.logger.info(`Realtime subscription status: ${status}`, {
            userId,
            error: err,
          });

          if (status === 'SUBSCRIBED') {
            this.logger.info(
              '[WebSocketClient] [OK] Successfully subscribed to highlights channel'
            );
          } else if (status === 'CHANNEL_ERROR') {
            this.logger.error(
              'Realtime channel error',
              err || new Error('Unknown channel error')
            );
          }
        });

      // Second channel for Page Groups (plan Phase 2 Task 2.3): both group
      // tables, owner-filtered like the highlights channel above.
      this.groupsChannel = this.supabase
        .channel('groups-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'page_groups',
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<SupabaseGroupRow>) =>
            this.handleGroupChange('page_groups', payload)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'page_group_items',
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresChangesPayload<SupabaseGroupItemRow>) =>
            this.handleGroupChange('page_group_items', payload)
        )
        .subscribe((status: string, err?: Error) => {
          this.logger.info(`Realtime groups subscription status: ${status}`, {
            userId,
            error: err,
          });

          if (status === 'SUBSCRIBED') {
            this.logger.info(
              '[WebSocketClient] [OK] Successfully subscribed to groups channel'
            );
          } else if (status === 'CHANNEL_ERROR') {
            this.logger.error(
              'Realtime groups channel error',
              err || new Error('Unknown channel error')
            );
          }
        });
    } catch (error) {
      this.logger.error('Failed to subscribe to realtime', error as Error);
      throw error;
    }
  }

  /**
   * Unsubscribe from the current channel
   */
  unsubscribe(): void {
    this.logger.info('Unsubscribing from realtime updates');
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = undefined;
    }
    if (this.groupsChannel) {
      this.groupsChannel.unsubscribe();
      this.groupsChannel = undefined;
    }
    this.currentUserId = undefined;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return (
      this.channel?.state === 'joined' || this.groupsChannel?.state === 'joined'
    );
  }

  /**
   * Handle incoming change events from Supabase
   */
  private handleChange(
    payload: RealtimePostgresChangesPayload<SupabaseHighlightRow>
  ): void {
    if (!payload || typeof payload !== 'object') {
      // Shape-only: full payloads may carry highlight URLs and text.
      this.logger.warn('[WebSocketClient] Ignoring malformed realtime payload', {
        payloadType: typeof payload,
      });
      return;
    }
    const eventType = payload.eventType;
    this.logger.info('[WebSocketClient] [MSG] Received realtime event', {
      event: eventType,
      table: payload.table,
      hasNew: !!payload.new,
      hasOld: !!payload.old,
    });

    switch (eventType) {
      case 'INSERT': {
        const row = payload.new;
        if (!row) return;
        const highlight = transformHighlightRow(row);
        this.logger.info('[WebSocketClient] Emitting REMOTE_HIGHLIGHT_CREATED', {
          id: highlight.id,
        });
        this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_CREATED, row);
        break;
      }
      case 'UPDATE': {
        const row = payload.new;
        if (!row) return;
        if (isHighlightRowSoftDeleted(row)) {
          this.logger.info('[WebSocketClient] Detected Soft Delete via UPDATE', {
            id: row.id,
          });
          this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_DELETED, { id: row.id });
        } else {
          this.logger.info('[WebSocketClient] Emitting REMOTE_HIGHLIGHT_UPDATED', {
            id: row.id,
          });
          this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_UPDATED, row);
        }
        break;
      }
      case 'DELETE': {
        const id = payload.old?.id;
        this.logger.info('[WebSocketClient] Emitting REMOTE_HIGHLIGHT_DELETED', { id });
        this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_DELETED, { id });
        break;
      }
      default:
        this.logger.warn('Unknown realtime event type', { type: eventType });
    }
  }

  /**
   * Handle incoming Page Groups change events from Supabase.
   * Mirrors handleChange: raw snake_case rows pass through the EventBus and
   * the group ingest service maps them. Soft deletes arrive as UPDATE rows
   * with deleted_at set (there is no DELETE RLS policy until Task 2.4).
   */
  private handleGroupChange(
    table: GroupTable,
    payload: RealtimePostgresChangesPayload<SupabaseGroupRow | SupabaseGroupItemRow>
  ): void {
    if (!payload || typeof payload !== 'object') {
      this.logger.warn('[WebSocketClient] Ignoring malformed groups payload', {
        payloadType: typeof payload,
      });
      return;
    }
    const isGroup = table === 'page_groups';
    const eventType = payload.eventType;
    this.logger.info('[WebSocketClient] [MSG] Received groups realtime event', {
      event: eventType,
      table,
      hasNew: !!payload.new,
      hasOld: !!payload.old,
    });

    switch (eventType) {
      case 'INSERT': {
        const row = payload.new;
        if (!row) return;
        this.eventBus.emit(
          isGroup ? EventName.REMOTE_GROUP_CREATED : EventName.REMOTE_GROUP_ITEM_CREATED,
          row
        );
        break;
      }
      case 'UPDATE': {
        const row = payload.new;
        if (!row) return;
        if (isGroupRowSoftDeleted(row)) {
          this.eventBus.emit(
            isGroup ? EventName.REMOTE_GROUP_DELETED : EventName.REMOTE_GROUP_ITEM_DELETED,
            { id: (row as { id?: string }).id }
          );
        } else {
          this.eventBus.emit(
            isGroup ? EventName.REMOTE_GROUP_UPDATED : EventName.REMOTE_GROUP_ITEM_UPDATED,
            row
          );
        }
        break;
      }
      case 'DELETE': {
        const old = payload.old as { id?: string; group_id?: string } | undefined;
        this.eventBus.emit(
          isGroup ? EventName.REMOTE_GROUP_DELETED : EventName.REMOTE_GROUP_ITEM_DELETED,
          isGroup ? { id: old?.id } : { id: old?.id, groupId: old?.group_id }
        );
        break;
      }
      default:
        this.logger.warn('Unknown realtime event type', { type: eventType });
    }
  }
}
