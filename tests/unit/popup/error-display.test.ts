/**
 * @file error-display.test.ts
 * @description Edge case tests for ErrorDisplay component
 * 
 * Tests cover:
 * - XSS prevention
 * - Accessibility edge cases
 * - Error type detection
 * - Retry button behavior
 * - DOM manipulation safety
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorDisplay } from '@/popup/components/error-display';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { AppError } from '@/shared/errors/app-error';
import { NetworkError } from '@/shared/errors/network-error';
import { ValidationError } from '@/shared/errors/validation-error';
import { StorageError } from '@/shared/errors/storage-error';

describe('ErrorDisplay - Edge Cases', () => {
    let errorDisplay: ErrorDisplay;
    let mockLogger: ILogger;
    let container: HTMLElement;

    beforeEach(() => {
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(() => 1),
        };

        errorDisplay = new ErrorDisplay(mockLogger);
        container = document.createElement('div');
        container.id = 'error-container';
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
        vi.clearAllMocks();
    });

    describe('XSS Prevention', () => {
        it('should escape HTML in error messages', () => {
            // Arrange: Error with HTML/script tags
            const maliciousError = new AppError(
                '<script>alert("XSS")</script><img src=x onerror=alert(1)>'
            );

            // Act
            errorDisplay.show(container, maliciousError);

            // Assert: Should escape HTML
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('<script>');
            expect(errorMessage?.innerHTML).not.toContain('<script>');

            // Should not execute script
            expect(container.querySelector('script')).toBeNull();
        });

        it('should escape HTML in error context metadata', () => {
            // Arrange: Error with malicious context
            const error = new AppError(
                'Normal message',
                {
                    userInput: '<img src=x onerror=alert(1)>',
                    code: 'TEST_ERROR'
                }
            );

            // Act
            errorDisplay.show(container, error);

            // Assert: No img tag should be rendered
            expect(container.querySelector('img')).toBeNull();
        });
    });

    describe('Error Type Detection', () => {
        it('should show network icon for NetworkError', () => {
            // Arrange
            const networkError = new NetworkError('Connection failed');

            // Act
            errorDisplay.show(container, networkError);

            // Assert
            const icon = container.querySelector('.error-icon');
            expect(icon?.textContent).toBe('🌐');
        });

        it('should show validation icon for ValidationError', () => {
            // Arrange
            const validationError = new ValidationError('Invalid input');

            // Act
            errorDisplay.show(container, validationError);

            // Assert
            const icon = container.querySelector('.error-icon');
            expect(icon?.textContent).toBe('⚠️');
        });

        it('should show storage icon for StorageError', () => {
            // Arrange
            const storageError = new StorageError('Save failed');

            // Act
            errorDisplay.show(container, storageError);

            // Assert
            const icon = container.querySelector('.error-icon');
            expect(icon?.textContent).toBe('💾');
        });

        it('should handle generic Error (not AppError)', () => {
            // Arrange
            const genericError = new Error('Something went wrong');

            // Act
            errorDisplay.show(container, genericError);

            // Assert: Should still display
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('Something went wrong');
        });
    });

    describe('Retry Button Behavior', () => {
        it('should show retry button for retryable errors', () => {
            // Arrange
            const retryableError = new NetworkError('Timeout');
            const onRetry = vi.fn();

            // Act
            errorDisplay.show(container, retryableError, onRetry);

            // Assert
            const retryButton = container.querySelector('[data-action="retry"]');
            expect(retryButton).not.toBeNull();
        });

        it('should not show retry button for non-retryable errors', () => {
            // Arrange
            const nonRetryableError = new ValidationError('Invalid data');
            const onRetry = vi.fn();

            // Act
            errorDisplay.show(container, nonRetryableError, onRetry);

            // Assert
            const retryButton = container.querySelector('[data-action="retry"]');
            expect(retryButton).toBeNull();
        });

        it('should call onRetry when retry button clicked', () => {
            // Arrange
            const error = new NetworkError('Failed');
            const onRetry = vi.fn();

            errorDisplay.show(container, error, onRetry);

            // Act
            const retryButton = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
            retryButton?.click();

            // Assert
            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it('should handle retry button clicked multiple times', () => {
            // Arrange
            const error = new NetworkError('Failed');
            const onRetry = vi.fn();

            errorDisplay.show(container, error, onRetry);

            // Act: Click multiple times rapidly
            const retryButton = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
            retryButton?.click();
            retryButton?.click();
            retryButton?.click();

            // Assert: Should be called each time (no debouncing in basic impl)
            expect(onRetry).toHaveBeenCalledTimes(3);
        });

        it('should handle async onRetry errors', async () => {
            // Arrange
            const error = new NetworkError('Failed');
            const onRetry = vi.fn().mockRejectedValue(new Error('Retry failed'));

            errorDisplay.show(container, error, onRetry);

            // Act
            const retryButton = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
            retryButton?.click();

            // Wait for async
            await new Promise(resolve => setTimeout(resolve, 10));

            // Assert: Should log error but not crash
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            // Arrange & Act
            errorDisplay.show(container, new AppError('Test error'));

            // Assert
            const errorCard = container.querySelector('.error-card');
            expect(errorCard?.getAttribute('role')).toBe('alert');
            expect(errorCard?.getAttribute('aria-live')).toBe('assertive');
        });

        it('should be keyboard accessible', () => {
            // Arrange
            const error = new NetworkError('Failed');
            const onRetry = vi.fn();

            errorDisplay.show(container, error, onRetry);

            // Act: Simulate keyboard navigation
            const retryButton = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
            retryButton?.focus();

            // Simulate Enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            retryButton?.dispatchEvent(enterEvent);

            // Assert: Button should be focusable
            expect(document.activeElement).toBe(retryButton);
        });
    });

    describe('DOM Manipulation Safety', () => {
        it('should clear previous error when showing new one', () => {
            // Arrange
            errorDisplay.show(container, new AppError('First error'));
            const firstErrorCount = container.querySelectorAll('.error-card').length;

            // Act
            errorDisplay.show(container, new AppError('Second error'));

            // Assert: Should only have one error card
            const errorCards = container.querySelectorAll('.error-card');
            expect(errorCards.length).toBe(1);
            expect(errorCards[0]?.textContent).toContain('Second error');
        });

        it('should handle hide() when no error displayed', () => {
            // Act & Assert: Should not throw
            expect(() => errorDisplay.hide(container)).not.toThrow();
        });

        it('should remove all content on hide()', () => {
            // Arrange
            errorDisplay.show(container, new AppError('Test'));

            // Act
            errorDisplay.hide(container);

            // Assert
            expect(container.classList.contains('hidden')).toBe(true);
            expect(container.querySelector('.error-card')).toBeNull();
        });

        it('should handle container being removed from DOM', () => {
            // Arrange
            errorDisplay.show(container, new AppError('Test'));

            // Act: Remove container
            container.remove();

            // Assert: Should not throw on subsequent operations
            expect(() => errorDisplay.hide(container)).not.toThrow();
        });
    });

    describe('Edge Case Error Messages', () => {
        it('should handle empty error message', () => {
            // Arrange
            const error = new AppError('');

            // Act
            errorDisplay.show(container, error);

            // Assert: Should still render something
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage).not.toBeNull();
        });

        it('should handle very long error message', () => {
            // Arrange
            const longMessage = 'A'.repeat(10000);
            const error = new AppError(longMessage);

            // Act
            errorDisplay.show(container, error);

            // Assert: Should render without crashing
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('A');
        });

        it('should handle unicode and emoji in error messages', () => {
            // Arrange
            const error = new AppError('Failed 😢 with unicode: 你好 مرحبا');

            // Act
            errorDisplay.show(container, error);

            // Assert
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('😢');
            expect(errorMessage?.textContent).toContain('你好');
        });

        it('should handle null/undefined error gracefully', () => {
            // Act & Assert: Should not crash
            expect(() => {
                errorDisplay.show(container, null as any);
            }).not.toThrow();

            expect(() => {
                errorDisplay.show(container, undefined as any);
            }).not.toThrow();
        });
    });

    describe('User Message Extraction', () => {
        it('should use toUserMessage() if available', () => {
            // Arrange
            const error = new NetworkError('Technical error message');

            // Act
            errorDisplay.show(container, error);

            // Assert: Should show user-friendly message
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('Connection failed');
            expect(errorMessage?.textContent).not.toContain('Technical error');
        });

        it('should fall back to error.message for generic errors', () => {
            // Arrange
            const error = new Error('Generic error message');

            // Act
            errorDisplay.show(container, error);

            // Assert
            const errorMessage = container.querySelector('.error-message');
            expect(errorMessage?.textContent).toContain('Generic error message');
        });
    });
});
