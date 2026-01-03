/**
 * @file validation-error.ts
 * @description Validation-related errors
 */

import { AppError, type ErrorContext } from './app-error';

/**
 * Validation Error
 *
 * Used for:
 * - Schema validation failures
 * - Input validation errors
 * - Data format errors
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, context, true); // Operational - validation errors are expected
  }

  override toUserMessage(): string {
    return 'Invalid data provided. Please check your input and try again.';
  }
}
