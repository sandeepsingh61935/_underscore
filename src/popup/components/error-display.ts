/**
 * @file error-display.ts
 * @description Reusable error display component for popup UI
 *
 * Features:
 * - User-friendly error messages (hides technical details)
 * - Retry button for retryable errors
 * - Error categorization (network, validation, internal)
 * - Accessibility (ARIA labels, keyboard navigation)
 *
 * @author Phase 4 Implementation Team
 * @version 2.0
 */

import { AppError } from '@/shared/errors/app-error';
import { NetworkError } from '@/shared/errors/network-error';
import { StorageError } from '@/shared/errors/storage-error';
import { ValidationError } from '@/shared/errors/validation-error';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Error Display Component
 *
 * Displays user-friendly error messages with appropriate icons and actions.
 *
 * Design Patterns:
 * - Component Pattern: Reusable UI component
 * - Strategy Pattern: Different display strategies per error type
 */
export class ErrorDisplay {
  constructor(private readonly logger: ILogger) {}

  /**
   * Show error in container
   *
   * @param container - DOM element to render error in
   * @param error - Error to display
   * @param onRetry - Optional retry callback
   */
  show(container: HTMLElement, error: Error, onRetry?: () => void | Promise<void>): void {
    if (!error) return; // Handle null/undefined gracefully

    // Log technical details
    this.logger.error('[ErrorDisplay] Showing error', error);

    // Get user-friendly message
    const message = this.getUserMessage(error);
    const icon = this.getErrorIcon(error);
    const isRetryable = this.isRetryableError(error);

    // Render error UI
    container.innerHTML = `
            <div class="error-card md-surface-container" role="alert" aria-live="assertive">
                <div class="error-icon">${icon}</div>
                <p class="error-message md-typescale-body-large">${this.escapeHtml(message)}</p>
                ${isRetryable && onRetry ? '<button class="retry-btn md-filled-button" data-action="retry">Try Again</button>' : ''}
            </div>
        `;

    // Attach retry handler
    if (isRetryable && onRetry) {
      const retryBtn = container.querySelector('[data-action="retry"]');
      retryBtn?.addEventListener('click', async () => {
        try {
          await onRetry();
        } catch (retryError) {
          this.logger.error('[ErrorDisplay] Retry failed', retryError as Error);
        }
      });
    }

    // Show container
    container.classList.remove('hidden');
  }

  /**
   * Hide error display
   *
   * @param container - DOM element containing error
   */
  hide(container: HTMLElement): void {
    // Safe clearing using textContent (works on detached nodes too)
    container.textContent = '';
    container.classList.add('hidden');
  }

  /**
   * Get user-friendly message from error
   */
  private getUserMessage(error: Error): string {
    if (error instanceof AppError) {
      return error.toUserMessage();
    }

    // Return error message for generic errors (sanitized by escapeHtml)
    // This allows developers/users to see what went wrong locally
    return (
      error.message || `An unexpected error occurred (${error.name}). Please try again.`
    );
  }

  /**
   * Get appropriate icon for error type
   */
  private getErrorIcon(error: Error): string {
    if (error instanceof NetworkError) {
      return '🌐'; // Network issues
    }
    if (error instanceof ValidationError) {
      return '⚠️'; // Validation issues
    }
    if (error instanceof StorageError) {
      return '💾'; // Storage issues
    }
    return '❌'; // Generic error
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Generic Error is NOT retryable
    if (error.constructor === Error) {
      return false;
    }

    // Validation errors are never retryable (need user input change)
    if (error instanceof ValidationError) {
      return false;
    }

    if (error instanceof AppError) {
      // AppError has isOperational flag
      return error.isOperational;
    }

    if (error instanceof NetworkError) {
      return true; // Network errors are usually transient
    }

    if (error instanceof StorageError) {
      return true; // Storage errors might be transient
    }

    return false; // Validation and unknown errors not retryable
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
