import { isAllowedExternalAuthOrigin } from '../auth/external-origin';
import type { ILogger } from '../interfaces/i-logger';
import type { IMessageBus } from '../interfaces/i-message-bus';
import {
  validateMessage,
  SYNC_AUTH_SESSION,
  type Message,
  type MessageTarget,
  type MessageHandler,
} from '../schemas/message-schemas';

/**
 * ChromeMessageBus - Cross-context messaging for Chrome extensions
 *
 * Implements IMessageBus using chrome.runtime API.
 * Provides:
 * - Type-safe message passing between contexts (content ↔ background ↔ popup)
 * - Automatic message validation (Zod schemas)
 * - Timeout handling (prevents hanging on dead contexts)
 * - Pub/sub pattern (subscribe/publish)
 *
 * @example
 * ```typescript
 * const logger = LoggerFactory.getLogger('MessageBus');
 * const messageBus = new ChromeMessageBus(logger, { timeoutMs: 5000 });
 *
 * // Send message
 * const result = await messageBus.send<{count: number}>('background', {
 *   type: 'GET_COUNT',
 *   payload: {},
 *   timestamp: Date.now()
 * });
 *
 * // Subscribe to messages
 * messageBus.subscribe<{mode: string}>('MODE_CHANGE', (payload, sender) => {
 *   console.log(`Mode changed to ${payload.mode}`);
 * });
 * ```
 */
export class ChromeMessageBus implements IMessageBus {
  private readonly handlers = new Map<string, Set<MessageHandler>>();
  private readonly timeoutMs: number;
  private messageListener:
    | ((
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response?: unknown) => void
      ) => boolean | void)
    | null = null;

  constructor(
    private readonly logger: ILogger,
    options: { timeoutMs?: number } = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? 5000; // Default 5s timeout
    this.setupMessageListener();
  }

  /**
   * Determine whether a chrome.runtime message sender is this extension.
   *
   * Per ADR-014: only messages whose `sender.id` matches `chrome.runtime.id`
   * are trusted. This blocks external extensions (whose `sender.id` is set to
   * their own extension ID) and any senders that lack an `id` at all (e.g.
   * the background's own internal publish path). Content scripts and the
   * popup both carry our extension ID on the sender.
   */
  private isTrustedSender(
    sender: chrome.runtime.MessageSender | undefined | null,
    messageType?: string
  ): boolean {
    if (!sender) {
      return false;
    }

    if (typeof sender.id === 'string' && sender.id === chrome.runtime.id) {
      return true;
    }

    if (messageType === SYNC_AUTH_SESSION && isAllowedExternalAuthOrigin(sender.url)) {
      return true;
    }

    return false;
  }

  /**
   * Setup chrome.runtime.onMessage listener
   * Dispatches incoming messages to registered handlers
   */
  private setupMessageListener(): void {
    this.messageListener = (message, sender, sendResponse) => {
      // Validate message structure
      let validatedMessage: Message;
      try {
        validatedMessage = validateMessage(message);
      } catch (error) {
        this.logger.warn('Invalid message received', {
          message,
          error: error instanceof Error ? error.message : String(error),
        });
        // Send error back if possible
        sendResponse({ success: false, error: 'Invalid message structure' });
        return false;
      }

      // Sender-origin guard (ADR-014): reject any message whose sender is
      // not this extension. Runs after validation so a structurally invalid
      // message is still classified as "invalid" (not "untrusted").
      if (!this.isTrustedSender(sender, validatedMessage.type)) {
        this.logger.warn('Rejected IPC from untrusted sender', {
          messageType: validatedMessage.type,
          senderId: sender?.id,
        });
        sendResponse({
          success: false,
          error: 'Untrusted sender',
          code: 'UNTRUSTED_SENDER',
        });
        return false;
      }

      // Find handlers for this message type
      const messageHandlers = this.handlers.get(validatedMessage.type);
      if (!messageHandlers || messageHandlers.size === 0) {
        return false; // No handlers, let other listeners handle it or close
      }

      // Execute handlers asynchronously and send response
      // Note: We only support single-response for now (first handler wins/returns)
      // This is a limitation of Chrome's sendResponse
      void (async () => {
        let responseSent = false;
        const safeSendResponse = (response: unknown): void => {
          if (responseSent) return;
          try {
            sendResponse(response);
            responseSent = true;
          } catch (error) {
            this.logger.warn('sendResponse failed (port may already be closed)', {
              messageType: validatedMessage.type,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        };

        try {
          for (const handler of messageHandlers) {
            try {
              const result = await handler(validatedMessage.payload, sender);

              if (!responseSent && result !== undefined) {
                safeSendResponse(result);
              }
            } catch (handlerError) {
              this.logger.error(
                'Message handler error',
                handlerError instanceof Error
                  ? handlerError
                  : new Error(String(handlerError)),
                { messageType: validatedMessage.type }
              );

              if (!responseSent) {
                safeSendResponse({
                  success: false,
                  error:
                    handlerError instanceof Error
                      ? handlerError.message
                      : 'Unknown handler error',
                });
              }
            }
          }

          if (!responseSent) {
            safeSendResponse({
              success: false,
              error: 'No response from message handler',
            });
          }
        } catch (error) {
          this.logger.error('Critical message bus error', error as Error);
          if (!responseSent) {
            safeSendResponse({
              success: false,
              error:
                error instanceof Error ? error.message : 'Critical message bus error',
            });
          }
        }
      })();

      return true; // Keep channel open for async response
    };

    chrome.runtime.onMessage.addListener(this.messageListener);
  }

  /**
   * Send message to specific target context
   * Implements timeout to prevent hanging
   */
  async send<T = unknown>(target: MessageTarget, message: Message): Promise<T> {
    // Validate message before sending
    validateMessage(message);

    this.logger.debug('Sending message', {
      target,
      messageType: message.type,
      requestId: message.requestId,
    });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Message send timeout after ${this.timeoutMs}ms (type: ${message.type}, target: ${target})`
          )
        );
      }, this.timeoutMs);
    });

    // Create send promise
    const sendPromise = new Promise<T>((resolve, reject) => {
      try {
        const handleResponse = (response: T): void => {
          // Prefer a defined response; lastError can be stale when nested IPC runs.
          if (response !== undefined && response !== null) {
            resolve(response);
            return;
          }
          if (chrome.runtime.lastError) {
            reject(
              new Error(
                `Chrome runtime error: ${chrome.runtime.lastError.message || 'Unknown runtime error'}`
              )
            );
            return;
          }
          resolve(response);
        };

        if (target === 'content') {
          // Content scripts must be messaged via tabs API
          const payload = message.payload as { tabId?: number };
          if (payload?.tabId) {
            chrome.tabs.sendMessage(payload.tabId, message, handleResponse);
          } else {
            // Fallback: Query active tab if no ID provided (best effort)
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const activeTab = tabs[0];
              if (!activeTab?.id) {
                reject(new Error('No active tab found to send content message'));
                return;
              }
              chrome.tabs.sendMessage(activeTab.id, message, handleResponse);
            });
          }
        } else {
          // Background/Popup are reachable via runtime API
          chrome.runtime.sendMessage(message, handleResponse);
        }
      } catch (error) {
        reject(error);
      }
    });

    // Race between send and timeout
    try {
      const response = await Promise.race([sendPromise, timeoutPromise]);
      this.logger.debug('Message send successful', {
        messageType: message.type,
        requestId: message.requestId,
      });
      return response;
    } catch (error) {
      this.logger.error(
        'Message send failed',
        error instanceof Error ? error : new Error(String(error)),
        { messageType: message.type, target }
      );
      throw error;
    }
  }

  /**
   * Subscribe to messages of specific type
   * Returns cleanup function to unsubscribe
   */
  subscribe<T = unknown>(messageType: string, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, new Set());
    }

    const handlers = this.handlers.get(messageType)!;
    handlers.add(handler as MessageHandler);

    this.logger.debug('Message handler registered', {
      messageType,
      handlerCount: handlers.size,
    });

    // Return unsubscribe function
    return () => {
      handlers.delete(handler as MessageHandler);
      this.logger.debug('Message handler unregistered', {
        messageType,
        handlerCount: handlers.size,
      });

      // Cleanup empty handler sets
      if (handlers.size === 0) {
        this.handlers.delete(messageType);
      }
    };
  }

  /**
   * Publish message to all subscribers
   * Broadcasts to all handlers registered for this message type
   */
  async publish(messageType: string, payload: unknown): Promise<void> {
    const handlers = this.handlers.get(messageType);
    if (!handlers || handlers.size === 0) {
      this.logger.debug('No handlers for published message', { messageType });
      return;
    }

    this.logger.debug('Publishing message', {
      messageType,
      handlerCount: handlers.size,
    });

    // Execute all handlers (fire-and-forget)
    const handlerPromises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(payload, {} as chrome.runtime.MessageSender);
      } catch (error) {
        this.logger.error(
          'Publish handler error',
          error instanceof Error ? error : new Error(String(error)),
          { messageType }
        );
      }
    });

    await Promise.allSettled(handlerPromises);
  }

  /**
   * Cleanup resources
   * Call before destroying the instance
   */
  dispose(): void {
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }
    this.handlers.clear();
    this.logger.debug('ChromeMessageBus disposed');
  }
}
