/**
 * @file popup-main.ts
 * @description Entry point for popup UI
 * 
 * Initializes DI container and bootstraps the popup controller
 * 
 * @author Phase 4 Implementation Team
 * @version 2.0
 */

import { PopupController } from '@/popup/popup-controller';
import { Container } from '@/shared/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { CircuitBreakerMessageBus } from '@/shared/services/circuit-breaker-message-bus';
import { RetryDecorator } from '@/shared/services/retry-decorator';
import { CircuitBreaker } from '@/shared/utils/circuit-breaker';
import { LoggerFactory } from '@/shared/utils/logger';

/**
 * Bootstrap the popup application
 */
async function bootstrap(): Promise<void> {
    try {
        // Create DI container
        const container = new Container();

        // Register logger
        container.registerSingleton<ILogger>('logger', () =>
            LoggerFactory.getLogger('Popup')
        );

        // Register circuit breaker for messaging
        container.registerSingleton('messagingCircuitBreaker', () => {
            const logger = container.resolve<ILogger>('logger');
            return new CircuitBreaker({
                failureThreshold: 5,
                successThreshold: 2,
                resetTimeout: 30000,
                name: 'PopupMessaging',
            }, logger);
        });

        // Register message bus (Phase 3 composition chain)
        container.registerSingleton<IMessageBus>('messageBus', () => {
            const logger = container.resolve<ILogger>('logger');
            const circuitBreaker = container.resolve<CircuitBreaker>('messagingCircuitBreaker');

            // Composition: CircuitBreaker → Retry → ChromeMessageBus
            return new CircuitBreakerMessageBus(
                new RetryDecorator(
                    new ChromeMessageBus(logger),
                    logger
                ),
                circuitBreaker
            );
        });

        // Register popup controller
        container.registerSingleton('popupController', () =>
            new PopupController(
                container.resolve<IMessageBus>('messageBus'),
                container.resolve<ILogger>('logger')
            )
        );

        // Resolve and initialize controller
        const controller = container.resolve<PopupController>('popupController');
        await controller.initialize();

        // Cleanup on window unload
        window.addEventListener('beforeunload', () => {
            controller.cleanup();
        });

        // eslint-disable-next-line no-console
        console.log('[Popup] Initialized successfully');
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Popup] Bootstrap failed', error);

        // Show error in UI
        const errorContainer = document.getElementById('error-state');
        const loadingState = document.getElementById('loading-state');

        if (errorContainer && loadingState) {
            loadingState.classList.add('hidden');
            errorContainer.classList.remove('hidden');
            errorContainer.innerHTML = `
                <div class="error-card">
                    <div class="error-icon">❌</div>
                    <p class="error-message">Failed to initialize popup. Please refresh.</p>
                </div>
            `;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
