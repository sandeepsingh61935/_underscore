/**
 * @file group-handlers.ts
 * @description Page Groups IPC handlers (plan Phase 1 Task 1.5, ADR-032 §8).
 *
 * Registers GROUPS_LIST, GROUP_GET, GROUP_MEMBERSHIP_FOR_URL, and GROUP_MUTATE
 * on the background message bus — the same `registerXHandlers` shape as the
 * billing and OAuth-grant handlers, keeping background.ts free of group logic.
 *
 * Scope (Task 1.3 open question): the repository partition is picked per call
 * from `authManager.isAuthenticated` via `createScopedGroupService`, exactly
 * how the highlight router (`createScopedHighlightQueryService`) and
 * TagService (scoped repo + auth getter) pick scope.
 *
 * Popup refresh pings need no extra work: every GroupService write already
 * calls `notifyLibraryDataChanged({ source: 'groups' })`.
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import {
  createScopedGroupService,
  GroupCapError,
  GroupNotFoundError,
  GroupValidationError,
  type GroupCloudSyncDeps,
} from '@/background/services/group-service';
import type { TabGroupSyncService } from '@/background/services/tab-group-sync-service';
import { isWebAppOrigin } from '@/shared/extension/web-app-origin-matches';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import {
  GROUP_GET,
  GROUP_MEMBERSHIP_FOR_URL,
  GROUP_MUTATE,
  GROUP_OPEN_IN_BROWSER,
  EXTENSION_GET_BROWSER_TAB_GROUPS,
  EXTENSION_FOCUS_TAB_GROUP,
  GROUPS_DISABLE_BROWSER_SYNC,
  GROUPS_IMPORT_BROWSER_TABS,
  GROUPS_LIST,
  ExtensionFocusTabGroupPayloadSchema,
  GroupGetPayloadSchema,
  GroupMembershipForUrlPayloadSchema,
  GroupMutatePayloadSchema,
  GroupOpenInBrowserPayloadSchema,
  GroupsImportBrowserTabsPayloadSchema,
  GroupsListPayloadSchema,
  type GroupMutatePayload,
} from '@/shared/schemas/message-schemas';
import { membershipsForUrl } from '@/shared/utils/group-membership';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

export interface GroupHandlerDeps {
  messageBus: IMessageBus;
  authManager: IAuthManager;
  basicGroupRepository: IGroupRepository;
  proGroupRepository: IGroupRepository;
  logger: ILogger;
  /**
   * Cloud dual-write (Task 2.2, wired in Task 2.3). Absent = local-only,
   * preserving the Phase 1 behavior for guests and unwired callers.
   */
  sync?: GroupCloudSyncDeps;
  /**
   * Tab group synchronization service (Phase 3 Task 3.4).
   */
  tabGroupSyncService?: TabGroupSyncService;
}

function toGroupError(error: unknown): {
  success: false;
  error: string;
  code: string;
  scope?: 'groups' | 'items';
  limit?: number;
} {
  if (error instanceof GroupCapError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      scope: error.scope,
      limit: error.limit,
    };
  }
  if (error instanceof GroupNotFoundError) {
    return { success: false, error: error.message, code: error.code };
  }
  if (error instanceof GroupValidationError) {
    return { success: false, error: error.message, code: error.code };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    code: 'GROUP_ERROR',
  };
}

export function registerGroupHandlers(deps: GroupHandlerDeps): void {
  const { messageBus, authManager, basicGroupRepository, proGroupRepository, logger } =
    deps;

  const service = () =>
    createScopedGroupService({
      isAuthenticated: authManager.isAuthenticated,
      basicRepository: basicGroupRepository,
      proRepository: proGroupRepository,
      logger,
      sync: deps.sync,
    });

  const repository = () =>
    authManager.isAuthenticated ? proGroupRepository : basicGroupRepository;

  messageBus.subscribe(GROUPS_LIST, async (payload: unknown) => {
    try {
      // Empty-shape payload, validated like every other channel so a malformed
      // caller gets INVALID_PAYLOAD instead of a silent list.
      const parsed = GroupsListPayloadSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        return {
          success: false,
          error: 'Invalid groups list payload',
          code: 'INVALID_PAYLOAD',
        };
      }
      const repo = repository();
      const groups = await repo.listGroups();
      const items = await repo.listAllItems();
      return { success: true, data: { groups, items } };
    } catch (error) {
      logger.error('GROUPS_LIST failed', error as Error);
      return toGroupError(error);
    }
  });

  messageBus.subscribe(GROUP_GET, async (payload: unknown) => {
    try {
      const parsed = GroupGetPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return { success: false, error: 'Group id is required', code: 'INVALID_PAYLOAD' };
      }
      const repo = repository();
      const group = await repo.getGroup(parsed.data.id);
      if (!group || group.deletedAt !== null) {
        return {
          success: false,
          error: `Group not found: ${parsed.data.id}`,
          code: 'GROUP_NOT_FOUND',
        };
      }
      const items = await repo.listItems(group.id);
      return { success: true, data: { group, items } };
    } catch (error) {
      logger.error('GROUP_GET failed', error as Error);
      return toGroupError(error);
    }
  });

  messageBus.subscribe(GROUP_MEMBERSHIP_FOR_URL, async (payload: unknown) => {
    try {
      const parsed = GroupMembershipForUrlPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return { success: false, error: 'URL is required', code: 'INVALID_PAYLOAD' };
      }
      const repo = repository();
      const groups = await repo.listGroups();
      const items = await repo.listAllItems();
      const memberships = membershipsForUrl(parsed.data.url, groups, items);
      return { success: true, data: { memberships } };
    } catch (error) {
      logger.error('GROUP_MEMBERSHIP_FOR_URL failed', error as Error);
      return toGroupError(error);
    }
  });

  messageBus.subscribe(GROUP_MUTATE, async (payload: unknown) => {
    try {
      const parsed = GroupMutatePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          success: false,
          error: 'Invalid group command payload',
          code: 'INVALID_PAYLOAD',
        };
      }
      const result = await dispatchMutate(
        service(),
        parsed.data,
        deps.tabGroupSyncService
      );
      return { success: true, data: result };
    } catch (error) {
      logger.error('GROUP_MUTATE failed', error as Error);
      return toGroupError(error);
    }
  });

  messageBus.subscribe(GROUPS_IMPORT_BROWSER_TABS, async (payload: unknown) => {
    try {
      if (!deps.tabGroupSyncService) {
        return {
          success: false,
          error: 'Tab group sync service unavailable',
          code: 'SERVICE_UNAVAILABLE',
        };
      }
      const parsed = GroupsImportBrowserTabsPayloadSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        return {
          success: false,
          error: 'Invalid import browser tabs payload',
          code: 'INVALID_PAYLOAD',
        };
      }
      const result = await deps.tabGroupSyncService.importBrowserTabGroups(
        parsed.data.browserGroupIds
      );
      return { success: true, data: result };
    } catch (error) {
      logger.error('GROUPS_IMPORT_BROWSER_TABS failed', error as Error);
      return toGroupError(error);
    }
  });

  messageBus.subscribe(GROUPS_DISABLE_BROWSER_SYNC, async () => {
    try {
      if (deps.tabGroupSyncService) {
        await deps.tabGroupSyncService.disableSync();
      }
      return { success: true, data: {} };
    } catch (error) {
      logger.error('GROUPS_DISABLE_BROWSER_SYNC failed', error as Error);
      return toGroupError(error);
    }
  });

  messageBus.subscribe(
    GROUP_OPEN_IN_BROWSER,
    async (payload: unknown, sender?: chrome.runtime.MessageSender) => {
      try {
        const senderUrl = sender?.url || sender?.tab?.url || sender?.origin;
        if (senderUrl && senderUrl.startsWith('http')) {
          if (!isWebAppOrigin(senderUrl)) {
            return {
              success: false,
              error: 'Unauthorized origin',
              code: 'UNAUTHORIZED',
            };
          }
        }

        const parsed = GroupOpenInBrowserPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            success: false,
            error: 'Invalid open in browser payload',
            code: 'INVALID_PAYLOAD',
          };
        }

        if (authManager.isAuthenticated) {
          const userId =
            authManager.currentUser?.id ??
            authManager.getAuthState?.()?.user?.id ??
            (typeof (authManager as any).getUserId === 'function'
              ? await (authManager as any).getUserId()
              : undefined);

          if (userId) {
            const repo = repository();
            const group = await repo.getGroup(parsed.data.groupId);
            if (group && group.ownerId && group.ownerId !== userId) {
              return {
                success: false,
                error: 'Access denied: not group owner',
                code: 'FORBIDDEN',
              };
            }
          }
        }

        if (!deps.tabGroupSyncService) {
          return {
            success: false,
            error: 'Tab group sync service unavailable',
            code: 'SERVICE_UNAVAILABLE',
          };
        }
        const response = await deps.tabGroupSyncService.openInBrowser(
          parsed.data.groupId,
          parsed.data.force
        );
        if (response.ok || response.needsConfirm) {
          return { success: true, data: response };
        }
        return {
          success: false,
          error: response.error ?? 'Failed to open group in browser',
          data: response,
        };
      } catch (error) {
        logger.error('GROUP_OPEN_IN_BROWSER failed', error as Error);
        return toGroupError(error);
      }
    }
  );

  messageBus.subscribe(
    EXTENSION_GET_BROWSER_TAB_GROUPS,
    async (_payload: unknown, sender?: chrome.runtime.MessageSender) => {
      try {
        const senderUrl = sender?.url || sender?.tab?.url || sender?.origin;
        if (senderUrl && senderUrl.startsWith('http')) {
          if (!isWebAppOrigin(senderUrl)) {
            return {
              success: false,
              error: 'Unauthorized origin',
              code: 'UNAUTHORIZED',
            };
          }
        }

        if (!deps.tabGroupSyncService) {
          return {
            success: false,
            error: 'Tab group sync service unavailable',
            code: 'SERVICE_UNAVAILABLE',
          };
        }

        const response = await deps.tabGroupSyncService.getBrowserTabGroups();
        if (response.ok) {
          return { success: true, data: response };
        }
        return {
          success: false,
          error: response.error ?? 'Failed to get browser tab groups',
          data: response,
        };
      } catch (error) {
        logger.error('EXTENSION_GET_BROWSER_TAB_GROUPS failed', error as Error);
        return toGroupError(error);
      }
    }
  );

  messageBus.subscribe(
    EXTENSION_FOCUS_TAB_GROUP,
    async (payload: unknown, sender?: chrome.runtime.MessageSender) => {
      try {
        const senderUrl = sender?.url || sender?.tab?.url || sender?.origin;
        if (senderUrl && senderUrl.startsWith('http')) {
          if (!isWebAppOrigin(senderUrl)) {
            return {
              success: false,
              error: 'Unauthorized origin',
              code: 'UNAUTHORIZED',
            };
          }
        }

        const parsed = ExtensionFocusTabGroupPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return {
            success: false,
            error: 'Invalid focus tab group payload',
            code: 'INVALID_PAYLOAD',
          };
        }

        if (!deps.tabGroupSyncService) {
          return {
            success: false,
            error: 'Tab group sync service unavailable',
            code: 'SERVICE_UNAVAILABLE',
          };
        }

        const response = await deps.tabGroupSyncService.focusTabGroup(
          parsed.data.browserGroupId
        );
        if (response.ok) {
          return { success: true, data: response };
        }
        return {
          success: false,
          error: response.error ?? 'Failed to focus tab group',
          data: response,
        };
      } catch (error) {
        logger.error('EXTENSION_FOCUS_TAB_GROUP failed', error as Error);
        return toGroupError(error);
      }
    }
  );
}

async function dispatchMutate(
  service: ReturnType<typeof createScopedGroupService>,
  payload: GroupMutatePayload,
  tabGroupSyncService?: TabGroupSyncService
): Promise<{ group?: PageGroup; item?: PageGroupItem }> {
  switch (payload.command) {
    case 'createGroup':
      return {
        group: await service.createGroup({ name: payload.name, color: payload.color }),
      };
    case 'renameGroup':
      return { group: await service.renameGroup(payload.id, payload.name) };
    case 'recolorGroup':
      return { group: await service.recolorGroup(payload.id, payload.color) };
    case 'deleteGroup': {
      if (tabGroupSyncService) {
        await tabGroupSyncService.handleDeleteGroup(payload.id, payload.closeTabs);
      }
      return { group: await service.deleteGroup(payload.id) };
    }
    case 'restoreGroup':
      return { group: await service.restoreGroup(payload.id) };
    case 'moveGroup':
      return { group: await service.moveGroup(payload.id, payload.to) };
    case 'addPage':
      return {
        item: await service.addPage(payload.groupId, {
          url: payload.url,
          title: payload.title ?? null,
          faviconUrl: payload.faviconUrl ?? null,
        }),
      };
    case 'addDomain':
      return {
        item: await service.addDomain(payload.groupId, {
          hostname: payload.hostname,
          includeSubdomains: payload.includeSubdomains ?? false,
        }),
      };
    case 'removeItem':
      return { item: await service.removeItem(payload.groupId, payload.itemId) };
    case 'restoreItem':
      return { item: await service.restoreItem(payload.groupId, payload.itemId) };
    case 'moveItem':
      return {
        item: await service.moveItem(payload.groupId, payload.itemId, payload.to),
      };
  }
}
