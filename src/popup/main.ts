/**
 * @file popup-main.ts
 * @description Popup entrypoint - initializes UI and controller
 *
 * Architecture:
 * - Creates dependency graph following DI pattern
 * - Initializes PopupController with full resilience stack
 * - Handles bootstrap errors gracefully
 *
 * Resilience Stack:
 * ChromeMessageBus → RetryDecorator → CircuitBreakerMessageBus → PopupController
 */

import { ConsoleLogger } from '@/shared/utils/logger';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { RetryDecorator } from '@/shared/services/retry-decorator';
import { CircuitBreakerMessageBus } from '@/shared/services/circuit-breaker-message-bus';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import { PopupController } from '@/popup/popup-controller';

/**
 * Bootstrap the popup application
 *
 * This function builds the entire dependency graph and initializes the controller.
 * All errors are caught and displayed to prevent silent failures.
 */
async function bootstrap(): Promise<void> {
    const logger = new ConsoleLogger('Popup');

    try {
        logger.info('[Bootstrap] Initializing popup...');

        // Build message bus with resilience decorators
        // Layer 1: Base Chrome IPC
        const baseMessageBus = new ChromeMessageBus(logger, { timeoutMs: 5000 });

        // Layer 2: Retry logic (handles transient failures)
        const retryMessageBus = new RetryDecorator(baseMessageBus, logger, {
            maxRetries: 3,
            initialDelayMs: 100,
            maxDelayMs: 1000,
            backoffMultiplier: 2,
        });

        // Layer 3: Circuit breaker (prevents cascading failures)
        const circuitBreaker = new CircuitBreaker(
            {
                failureThreshold: 3,
                successThreshold: 2,
                resetTimeout: 5000,
                name: 'PopupCircuitBreaker',
            },
            logger
        );
        const messageBus = new CircuitBreakerMessageBus(retryMessageBus, circuitBreaker);

        // Initialize controller (will create StateManager and ErrorDisplay internally)
        const controller = new PopupController(messageBus, logger);

        // Start the popup
        await controller.initialize();

        logger.info('[Bootstrap] Popup initialized successfully');
    } catch (error) {
        logger.error('[Bootstrap] Failed to initialize popup', error as Error);

        // Show fallback error UI (don't crash silently)
        const errorContainer = document.getElementById('error-state');
        if (errorContainer) {
            errorContainer.classList.remove('hidden');
            errorContainer.innerHTML = `
        <div class="error-card" role="alert" aria-live="assertive">
          <div class="error-icon">⚠️</div>
          <p class="error-message">Failed to initialize popup</p>
          <p style="font-size: 12px; color: var(--md-sys-color-on-surface-variant); margin-top: 8px;">
            Please reload the extension or check browser console for details.
          </p>
        </div>
      `;
        }

        // Hide loading state
        document.getElementById('loading-state')?.classList.add('hidden');
    }
}

// Run bootstrap when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    // DOM already loaded
    bootstrap();
}
