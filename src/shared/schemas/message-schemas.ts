import { z } from 'zod';

import {
  GroupColorSchema,
  PageGroupItemSchema,
  PageGroupSchema,
} from '@/shared/schemas/page-group-schema';

/**
 * Valid message targets in Chrome extension
 * - 'background': Background service worker
 * - 'content': Content script in webpage
 * - 'popup': Popup UI window
 */
export const MessageTargetSchema = z.enum(['background', 'content', 'popup']);
export type MessageTarget = z.infer<typeof MessageTargetSchema>;

/**
 * Base message structure for IPC
 * All messages must have:
 * - type: Message type identifier (e.g., 'GET_HIGHLIGHTS', 'MODE_CHANGE')
 * - payload: Message data (validated by specific handlers)
 * - requestId: Optional UUID for request/response correlation
 * - timestamp: Message creation time (milliseconds since epoch)
 */
export const MessageSchema = z.object({
  type: z.string().min(1, 'Message type cannot be empty'),
  payload: z.unknown(),
  requestId: z.string().uuid().optional(),
  timestamp: z.number().positive('Timestamp must be positive'),
});
export type Message = z.infer<typeof MessageSchema>;

/**
 * Message response wrapper
 * Either success with data or error with message
 */
export const MessageResponseSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.unknown().optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.string().optional(),
    /** Milliseconds until the caller may retry, when the error is a rate limit. */
    retryAfterMs: z.number().optional(),
    /**
     * Serialized GroupCapError detail; present only with
     * `code: 'GROUP_CAP_EXCEEDED'` (see GroupCapErrorInfoSchema below).
     * Declared here so bus-side validation never strips cap details.
     */
    scope: z.enum(['groups', 'items']).optional(),
    limit: z.number().optional(),
  }),
]);
export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      code?: string;
      retryAfterMs?: number;
      scope?: 'groups' | 'items';
      limit?: number;
    };

/**
 * Type-safe message handler function
 * Can return data for request/response pattern or void for fire-and-forget
 */
export type MessageHandler<T = unknown, R = unknown> = (
  payload: T,
  sender: chrome.runtime.MessageSender
) => R | Promise<R> | void | Promise<void>;

/**
 * Validates a message and returns typed result
 * @throws {z.ZodError} if message is invalid
 */
export function validateMessage(message: unknown): Message {
  return MessageSchema.parse(message);
}

/**
 * IPC channel identifiers for the highlight bridge.
 *
 * These are owned by the background-side `BackgroundHighlightOrchestrator`
 * and the content-side `IpcHighlightRepository`. Defining them in one
 * place prevents typo-driven channel mismatches.
 */
export const IPC_HIGHLIGHT_GET = 'IPC_HIGHLIGHT_GET' as const;

/** One-shot wipe of all highlight data after export (crypto-removal migration). */
export const CLEAR_HIGHLIGHT_DATA = 'CLEAR_HIGHLIGHT_DATA' as const;

/** Scoped delete: highlight | section | domain | library */
export const IPC_HIGHLIGHT_DELETE_SCOPE = 'IPC_HIGHLIGHT_DELETE_SCOPE' as const;
/** Undo the most recent single-highlight delete (5s window). */
export const IPC_HIGHLIGHT_UNDO_DELETE = 'IPC_HIGHLIGHT_UNDO_DELETE' as const;

/** Broadcast when cloud hydration backfills local highlight storage. */
export const LIBRARY_DATA_CHANGED = 'LIBRARY_DATA_CHANGED' as const;

/** Request a manual cloud → local library sync from Settings. */
export const SYNC_LIBRARY = 'SYNC_LIBRARY' as const;

/** Copy Guest library rows not already in the account (Settings / sign-in prompt). */
export const UPLOAD_FROM_DEVICE = 'UPLOAD_FROM_DEVICE' as const;

/** Count of Guest rows that would be uploaded. */
export const DEVICE_UPLOAD_PREVIEW = 'DEVICE_UPLOAD_PREVIEW' as const;

/**
 * Progress while SYNC_LIBRARY hydrate runs (0–100).
 * Payload: { percent: number; phase?: string }.
 */
export const LIBRARY_SYNC_PROGRESS = 'LIBRARY_SYNC_PROGRESS' as const;

/** Fetch highlights formatted for scoped copy/export (library, domain, section, highlight). */
export const GET_EXPORTABLE_HIGHLIGHTS = 'GET_EXPORTABLE_HIGHLIGHTS' as const;

/** Update user notes/tags/presentation on a highlight (popup and web app). */
export const UPDATE_HIGHLIGHT_METADATA = 'UPDATE_HIGHLIGHT_METADATA' as const;

/** Update curated highlight body text (Collections Edit). Does not rewrite ranges/selectors. */
export const UPDATE_HIGHLIGHT_TEXT = 'UPDATE_HIGHLIGHT_TEXT' as const;

/** List normalized user labels for autocomplete (extension popup / web). */
export const GET_USER_TAGS = 'GET_USER_TAGS' as const;

/**
 * Search highlights by text/notes/labels/url, scoped to the whole library,
 * a domain, or a domain+section. Payload: { query, domain?, section?, fields? }.
 * Response data: { highlights: Array<DomainHighlightSummary & { matchedFields }> }
 * with `createdAt` serialized as an ISO string over IPC (mirrors
 * GET_HIGHLIGHTS_BY_DOMAIN's date serialization).
 */
export const SEARCH_HIGHLIGHTS = 'SEARCH_HIGHLIGHTS' as const;

/** Auth IPC channels */
export const AUTH_STATE_CHANGED = 'AUTH_STATE_CHANGED' as const;
export const AUTH_SESSION_CLEARED = 'AUTH_SESSION_CLEARED' as const;
export const SYNC_AUTH_SESSION = 'SYNC_AUTH_SESSION' as const;
export const CLEAR_VERIFICATION_STATE = 'CLEAR_VERIFICATION_STATE' as const;
export const GET_AUTH_STATE = 'GET_AUTH_STATE' as const;
export const LOGIN = 'LOGIN' as const;
export const LOGIN_EMAIL = 'LOGIN_EMAIL' as const;
export const REGISTER_EMAIL = 'REGISTER_EMAIL' as const;
export const LOGOUT = 'LOGOUT' as const;

/**
 * IPC channels for ADR-021 (LLM service architecture).
 *
 * - IPC_AI_STREAM_CHAT_REQUEST:  opens a Port; payload = { template, highlights, opts }
 *                               responses on the port: CHUNK, DONE, ERROR
 * - IPC_AI_CHAT:                 single-shot completion (non-streaming)
 * - IPC_AI_HEALTH_CHECK:         { provider: 'anthropic'|'ollama'|'gemini'|'openai'|'openrouter' } -> { ok, model, error? }
 * - IPC_AI_SET_API_KEY:          { provider, key?, model? } -> { ok: true } | error
 * - IPC_AI_GET_API_KEY_STATUS:   { provider } -> { configured: boolean, model: string }
 * - IPC_AI_GET_ACTIVE_PROVIDER:    -> { provider: ProviderName | null }
 * - IPC_AI_SET_ACTIVE_PROVIDER:  { provider } -> { ok: true } | error (configured only)
 * - IPC_AI_LIST_PROVIDERS:       -> [{ name, configured }]
 * - IPC_AI_GET_PAGE_CONTEXT:     { highlights: [{ url, text }] } -> marked page context
 * - IPC_AI_SYNC_PREFS:           {} -> { source, wroteRemote } account LWW prefs (no secrets)
 */
export const IPC_AI_STREAM_CHAT_REQUEST = 'IPC_AI_STREAM_CHAT_REQUEST' as const;
export const IPC_AI_CHAT = 'IPC_AI_CHAT' as const;
export const IPC_AI_HEALTH_CHECK = 'IPC_AI_HEALTH_CHECK' as const;
export const IPC_AI_SET_API_KEY = 'IPC_AI_SET_API_KEY' as const;
export const IPC_AI_GET_API_KEY_STATUS = 'IPC_AI_GET_API_KEY_STATUS' as const;
export const IPC_AI_GET_ACTIVE_PROVIDER = 'IPC_AI_GET_ACTIVE_PROVIDER' as const;
/** Switch Ask default among already-configured providers (no secrets). */
export const IPC_AI_SET_ACTIVE_PROVIDER = 'IPC_AI_SET_ACTIVE_PROVIDER' as const;
export const IPC_AI_LIST_PROVIDERS = 'IPC_AI_LIST_PROVIDERS' as const;
export const IPC_AI_GET_PAGE_CONTEXT = 'IPC_AI_GET_PAGE_CONTEXT' as const;
export const IPC_AI_LIST_PROVIDER_MODELS = 'IPC_AI_LIST_PROVIDER_MODELS' as const;
/** Pull/push account AI prefs (default model + enablement); LWW. */
export const IPC_AI_SYNC_PREFS = 'IPC_AI_SYNC_PREFS' as const;

/**
 * Billing (Polar) IPC — extension popup talks to background.
 * Background holds Supabase session + calls edge functions / entitlement table.
 */
export const IPC_BILLING_GET_ENTITLEMENT = 'IPC_BILLING_GET_ENTITLEMENT' as const;
export const IPC_BILLING_START_CHECKOUT = 'IPC_BILLING_START_CHECKOUT' as const;
export const IPC_BILLING_OPEN_PORTAL = 'IPC_BILLING_OPEN_PORTAL' as const;
/** Pull Polar customer state into billing_entitlements then client re-reads. */
export const IPC_BILLING_SYNC_FROM_POLAR = 'IPC_BILLING_SYNC_FROM_POLAR' as const;

/** OAuth client grants for Cloud MCP Connected truth (extension popup). */
export const IPC_OAUTH_LIST_GRANTS = 'IPC_OAUTH_LIST_GRANTS' as const;
export const IPC_OAUTH_REVOKE_GRANT = 'IPC_OAUTH_REVOKE_GRANT' as const;
export const IPC_MCP_LAST_SESSION = 'IPC_MCP_LAST_SESSION' as const;
export const PAGE_CONTENT_CACHED = 'PAGE_CONTENT_CACHED' as const;

/** Anchor drift and orphaned highlight recovery IPC channels */
export const PAGE_RESTORATION_STATUS = 'PAGE_RESTORATION_STATUS' as const;
export const GET_RESTORATION_STATUS = 'GET_RESTORATION_STATUS' as const;
export const CHECK_PAGE_SELECTION = 'CHECK_PAGE_SELECTION' as const;
export const REANCHOR_HIGHLIGHT = 'REANCHOR_HIGHLIGHT' as const;

export interface PageRestorationStatusPayload {
  url: string;
  anchoredCount: number;
  unanchoredIds: string[];
}

/**
 * Page Groups IPC channels (plan Phase 1 Task 1.5, ADR-032 §8).
 *
 * - GROUPS_LIST: `{}` -> `{ groups, items }` (live rows only, position-ordered).
 * - GROUP_GET: `{ id }` -> `{ group, items }` or `GROUP_NOT_FOUND`.
 * - GROUP_MEMBERSHIP_FOR_URL: `{ url }` -> `{ memberships }` for the Home chip.
 * - GROUP_MUTATE: discriminated `{ command, ... }` mirroring GroupService
 *   commands. Cap failures serialize as `{ success: false,
 *   code: 'GROUP_CAP_EXCEEDED', scope, limit }` (see GroupCapErrorInfoSchema).
 */
export const GROUPS_LIST = 'GROUPS_LIST' as const;
export const GROUP_GET = 'GROUP_GET' as const;
export const GROUP_MEMBERSHIP_FOR_URL = 'GROUP_MEMBERSHIP_FOR_URL' as const;
export const GROUP_MUTATE = 'GROUP_MUTATE' as const;
export const GROUP_OPEN_IN_BROWSER = 'GROUP_OPEN_IN_BROWSER' as const;
export const EXTENSION_GET_BROWSER_TAB_GROUPS = 'EXTENSION_GET_BROWSER_TAB_GROUPS' as const;
export const EXTENSION_FOCUS_TAB_GROUP = 'EXTENSION_FOCUS_TAB_GROUP' as const;
export const GROUPS_IMPORT_BROWSER_TABS = 'GROUPS_IMPORT_BROWSER_TABS' as const;
export const GROUPS_DISABLE_BROWSER_SYNC = 'GROUPS_DISABLE_BROWSER_SYNC' as const;

export const BrowserTabGroupSummarySchema = z.object({
  id: z.number().int(),
  title: z.string(),
  color: GroupColorSchema,
  tabCount: z.number().int().nonnegative(),
  validUrls: z.array(z.string()),
  skippedCount: z.number().int().nonnegative(),
});
export type BrowserTabGroupSummary = z.infer<typeof BrowserTabGroupSummarySchema>;

export const ExtensionGetBrowserTabGroupsPayloadSchema = z.object({}).optional();
export type ExtensionGetBrowserTabGroupsPayload = z.infer<
  typeof ExtensionGetBrowserTabGroupsPayloadSchema
>;

export const ExtensionGetBrowserTabGroupsResponseSchema = z.object({
  ok: z.boolean(),
  groups: z.array(BrowserTabGroupSummarySchema).optional(),
  error: z.string().optional(),
});
export type ExtensionGetBrowserTabGroupsResponse = z.infer<
  typeof ExtensionGetBrowserTabGroupsResponseSchema
>;

export const ExtensionFocusTabGroupPayloadSchema = z.object({
  browserGroupId: z.number().int(),
});
export type ExtensionFocusTabGroupPayload = z.infer<
  typeof ExtensionFocusTabGroupPayloadSchema
>;

export const ExtensionFocusTabGroupResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type ExtensionFocusTabGroupResponse = z.infer<
  typeof ExtensionFocusTabGroupResponseSchema
>;

export const GroupsImportBrowserTabsPayloadSchema = z.object({
  browserGroupIds: z.array(z.number().int()).optional(),
});
export type GroupsImportBrowserTabsPayload = z.infer<
  typeof GroupsImportBrowserTabsPayloadSchema
>;

export const GroupsImportBrowserTabsResponseSchema = z.object({
  importedCount: z.number().int().nonnegative(),
});
export type GroupsImportBrowserTabsResponse = z.infer<
  typeof GroupsImportBrowserTabsResponseSchema
>;

export const GroupOpenInBrowserPayloadSchema = z.object({
  groupId: z.string().uuid(),
  force: z.boolean().optional(),
});
export type GroupOpenInBrowserPayload = z.infer<typeof GroupOpenInBrowserPayloadSchema>;

export const GroupOpenInBrowserResponseSchema = z.object({
  ok: z.boolean(),
  needsConfirm: z.boolean().optional(),
  tabCount: z.number().int().nonnegative().optional(),
  browserGroupId: z.number().int().optional(),
  error: z.string().optional(),
});
export type GroupOpenInBrowserResponse = z.infer<typeof GroupOpenInBrowserResponseSchema>;

export const GroupsListPayloadSchema = z.object({});
export type GroupsListPayload = z.infer<typeof GroupsListPayloadSchema>;

export const GroupGetPayloadSchema = z.object({
  id: z.string().min(1),
});
export type GroupGetPayload = z.infer<typeof GroupGetPayloadSchema>;

export const GroupMembershipForUrlPayloadSchema = z.object({
  url: z.string().min(1).max(2048),
});
export type GroupMembershipForUrlPayload = z.infer<
  typeof GroupMembershipForUrlPayloadSchema
>;

export const GroupMoveDirectionSchema = z.enum(['top', 'up', 'down']);
export type GroupMoveDirection = z.infer<typeof GroupMoveDirectionSchema>;

/**
 * Discriminated command payload mirroring GroupService commands 1:1.
 * Handlers validate with this schema and return INVALID_PAYLOAD on mismatch.
 */
export const GroupMutatePayloadSchema = z.discriminatedUnion('command', [
  z.object({
    command: z.literal('createGroup'),
    name: z.string(),
    color: GroupColorSchema.optional(),
  }),
  z.object({
    command: z.literal('renameGroup'),
    id: z.string().min(1),
    name: z.string(),
  }),
  z.object({
    command: z.literal('recolorGroup'),
    id: z.string().min(1),
    color: GroupColorSchema,
  }),
  z.object({
    command: z.literal('deleteGroup'),
    id: z.string().min(1),
    closeTabs: z.boolean().optional(),
  }),
  z.object({ command: z.literal('restoreGroup'), id: z.string().min(1) }),
  z.object({
    command: z.literal('moveGroup'),
    id: z.string().min(1),
    to: GroupMoveDirectionSchema,
  }),
  z.object({
    command: z.literal('addPage'),
    groupId: z.string().min(1),
    url: z.string().min(1).max(2048),
    title: z.string().max(500).nullable().optional(),
    faviconUrl: z.string().max(2048).nullable().optional(),
  }),
  z.object({
    command: z.literal('addDomain'),
    groupId: z.string().min(1),
    hostname: z.string().min(1).max(255),
    includeSubdomains: z.boolean().optional(),
  }),
  z.object({
    command: z.literal('removeItem'),
    groupId: z.string().min(1),
    itemId: z.string().min(1),
  }),
  z.object({
    command: z.literal('restoreItem'),
    groupId: z.string().min(1),
    itemId: z.string().min(1),
  }),
  z.object({
    command: z.literal('moveItem'),
    groupId: z.string().min(1),
    itemId: z.string().min(1),
    to: GroupMoveDirectionSchema,
  }),
]);
export type GroupMutatePayload = z.infer<typeof GroupMutatePayloadSchema>;

/** Serialized GroupCapError: travels on the error envelope next to `code`. */
export const GroupCapErrorInfoSchema = z.object({
  scope: z.enum(['groups', 'items']),
  limit: z.number().int().positive(),
});
export type GroupCapErrorInfo = z.infer<typeof GroupCapErrorInfoSchema>;

export const GroupsListResponseSchema = z.object({
  groups: z.array(PageGroupSchema),
  items: z.array(PageGroupItemSchema),
});
export type GroupsListResponse = z.infer<typeof GroupsListResponseSchema>;

export const GroupGetResponseSchema = z.object({
  group: PageGroupSchema,
  items: z.array(PageGroupItemSchema),
});
export type GroupGetResponse = z.infer<typeof GroupGetResponseSchema>;

export const GroupMembershipResponseSchema = z.object({
  memberships: z.array(
    z.object({
      group: PageGroupSchema,
      viaHostname: z.string().nullable(),
    })
  ),
});
export type GroupMembershipResponse = z.infer<typeof GroupMembershipResponseSchema>;

/** Group commands set `group`, item commands set `item`. */
export const GroupMutateResponseSchema = z.object({
  group: PageGroupSchema.optional(),
  item: PageGroupItemSchema.optional(),
});
export type GroupMutateResponse = z.infer<typeof GroupMutateResponseSchema>;

/**
 * Validates message target
 * @throws {z.ZodError} if target is invalid
 */
export function validateMessageTarget(target: unknown): MessageTarget {
  return MessageTargetSchema.parse(target);
}

/**
 * Creates a success response
 */
export function createSuccessResponse<T>(data: T): MessageResponse<T> {
  return { success: true, data };
}

/**
 * Creates an error response
 */
export function createErrorResponse(error: string, code?: string): MessageResponse {
  return { success: false, error, code };
}
