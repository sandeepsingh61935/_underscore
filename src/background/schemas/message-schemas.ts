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
