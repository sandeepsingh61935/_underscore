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
    data: z.unknown(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    code: z.string().optional(),
  }),
]);
export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

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
 * IPC channel identifiers for the highlight bridge (ADR-013).
 *
 * These are owned by the background-side `BackgroundHighlightOrchestrator`
 * and the content-side `IpcHighlightRepository`. Defining them in one
 * place prevents typo-driven channel mismatches.
 */
export const IPC_HIGHLIGHT_DECRYPT_TEXT = 'IPC_HIGHLIGHT_DECRYPT_TEXT' as const;
export const IPC_HIGHLIGHT_GET = 'IPC_HIGHLIGHT_GET' as const;

/** Scoped delete: highlight | section | domain | library */
export const IPC_HIGHLIGHT_DELETE_SCOPE = 'IPC_HIGHLIGHT_DELETE_SCOPE' as const;
/** Undo the most recent single-highlight delete (5s window). */
export const IPC_HIGHLIGHT_UNDO_DELETE = 'IPC_HIGHLIGHT_UNDO_DELETE' as const;

/** Whether the encryption vault blocks destructive operations for the signed-in user. */
export const GET_VAULT_LOCK_STATUS = 'GET_VAULT_LOCK_STATUS' as const;

/** Broadcast when cloud hydration backfills local highlight storage. */
export const LIBRARY_DATA_CHANGED = 'LIBRARY_DATA_CHANGED' as const;

/** Request a manual cloud → local library sync from Settings. */
export const SYNC_LIBRARY = 'SYNC_LIBRARY' as const;

/** Fetch highlights formatted for scoped copy/export (library, domain, section, highlight). */
export const GET_EXPORTABLE_HIGHLIGHTS = 'GET_EXPORTABLE_HIGHLIGHTS' as const;

/** Update user notes/tags on a highlight (popup and web app). */
export const UPDATE_HIGHLIGHT_METADATA = 'UPDATE_HIGHLIGHT_METADATA' as const;

/**
 * IPC channel for the user-facing vault unlock prompt (ADR-018).
 *
 * Payload: { passphrase: string }
 * Success: { success: true, data: { keyId: string } }
 * Failure: { success: false, error: string, code: 'VAULT_LOCKED' | 'INVALID_PASSPHRASE' | 'DEPRECATED_FORMAT' | 'NOT_AUTHENTICATED' }
 */
export const IPC_VAULT_UNLOCK = 'IPC_VAULT_UNLOCK' as const;

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
 * - IPC_AI_HEALTH_CHECK:         { provider: 'anthropic'|'ollama'|'gemini'|'openai'|'openrouter'|'minimax' } -> { ok, model, error? }
 * - IPC_AI_SET_API_KEY:          { provider, key?, model? } -> { ok: true } | error
 * - IPC_AI_GET_API_KEY_STATUS:   { provider } -> { configured: boolean, model: string }
 * - IPC_AI_GET_ACTIVE_PROVIDER:    -> { provider: ProviderName | null }
 * - IPC_AI_LIST_PROVIDERS:       -> [{ name, configured }]
 * - IPC_AI_GET_PAGE_CONTEXT:     { highlights: [{ url, text }] } -> marked page context
 */
export const IPC_AI_STREAM_CHAT_REQUEST = 'IPC_AI_STREAM_CHAT_REQUEST' as const;
export const IPC_AI_CHAT = 'IPC_AI_CHAT' as const;
export const IPC_AI_HEALTH_CHECK = 'IPC_AI_HEALTH_CHECK' as const;
export const IPC_AI_SET_API_KEY = 'IPC_AI_SET_API_KEY' as const;
export const IPC_AI_GET_API_KEY_STATUS = 'IPC_AI_GET_API_KEY_STATUS' as const;
export const IPC_AI_GET_ACTIVE_PROVIDER = 'IPC_AI_GET_ACTIVE_PROVIDER' as const;
export const IPC_AI_LIST_PROVIDERS = 'IPC_AI_LIST_PROVIDERS' as const;
export const IPC_AI_GET_PAGE_CONTEXT = 'IPC_AI_GET_PAGE_CONTEXT' as const;
export const IPC_AI_LIST_PROVIDER_MODELS = 'IPC_AI_LIST_PROVIDER_MODELS' as const;
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
