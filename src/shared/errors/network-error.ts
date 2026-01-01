/**
 * @file network-error.ts
 * @description Network-related error for IPC and external requests
 */

import { AppError, type ErrorContext } from './app-error';

/**
 * Network Error
 * 
 * Used for:
 * - IPC communication failures
 * - Network timeouts
 * - Connection errors
 */
export class NetworkError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, true); // Operational - network issues are expected
    }

    override toUserMessage(): string {
        return 'Connection failed. Please check your network and try again.';
    }
}
