/**
 * @file storage-error.ts
 * @description Storage-related error for persistence operations
 */

import { AppError, type ErrorContext } from './app-error';

/**
 * Storage Error
 *
 * Used for:
 * - IndexedDB failures
 * - Chrome storage failures
 * - Quota exceeded errors
 */
export class StorageError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, context, true); // Operational - storage issues are expected
  }

  override toUserMessage(): string {
    return 'Failed to save data. Please try again or clear some space.';
  }
}
