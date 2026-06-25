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

/**
 * IPC channel for the user-facing vault unlock prompt (ADR-018).
 *
 * Payload: { passphrase: string }
 * Success: { success: true, data: { keyId: string } }
 * Failure: { success: false, error: string, code: 'VAULT_LOCKED' | 'INVALID_PASSPHRASE' | 'DEPRECATED_FORMAT' | 'NOT_AUTHENTICATED' }
 */
export const IPC_VAULT_UNLOCK = 'IPC_VAULT_UNLOCK' as const;

/**
 * IPC channels for ADR-021 (LLM service architecture).
 *
 * - IPC_AI_STREAM_CHAT_REQUEST:  opens a Port; payload = { template, highlights, opts }
 *                               responses on the port: CHUNK, DONE, ERROR
 * - IPC_AI_CHAT:                 single-shot completion (non-streaming)
 * - IPC_AI_HEALTH_CHECK:         { provider: 'anthropic'|'ollama'|'gemini'|'openai'|'openrouter'|'minimax' } -> { ok, model, error? }
 * - IPC_AI_SET_API_KEY:          { provider, key } -> { ok: true } | error
 * - IPC_AI_GET_API_KEY_STATUS:   { provider } -> { configured: boolean, mode: ModeName }
 * - IPC_AI_LIST_PROVIDERS:       -> [{ name, configured }]
 */
export const IPC_AI_STREAM_CHAT_REQUEST = 'IPC_AI_STREAM_CHAT_REQUEST' as const;
export const IPC_AI_CHAT = 'IPC_AI_CHAT' as const;
export const IPC_AI_HEALTH_CHECK = 'IPC_AI_HEALTH_CHECK' as const;
export const IPC_AI_SET_API_KEY = 'IPC_AI_SET_API_KEY' as const;
export const IPC_AI_GET_API_KEY_STATUS = 'IPC_AI_GET_API_KEY_STATUS' as const;
export const IPC_AI_LIST_PROVIDERS = 'IPC_AI_LIST_PROVIDERS' as const;
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
