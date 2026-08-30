import { z } from 'zod';

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
  }),
]);
export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string; retryAfterMs?: number };

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
