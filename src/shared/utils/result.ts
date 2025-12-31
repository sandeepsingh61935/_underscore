/**
 * @file result.ts
 * @description Functional error handling utilities (Result pattern)
 */

import { AppError, SystemError } from '@/shared/errors/app-error';

/**
 * Discriminator for Result type
 */
export type Result<T, E = AppError> =
    | { ok: true; value: T }
    | { ok: false; error: E };

/**
 * Create a success result
 */
export function ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
}

/**
 * Create a failure result
 */
export function err<E>(error: E): Result<never, E> {
    return { ok: false, error };
}

/**
 * Unwrap a Result, throwing the error if it failed
 * @throws {E}
 */
export function unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) {
        return result.value;
    }
    throw result.error;
}

/**
 * Execute a promise and convert it to a Result
 * Catches any thrown errors and converts them to AppError
 */
export async function safe<T>(promise: Promise<T>): Promise<Result<T, AppError>> {
    try {
        const value = await promise;
        return ok(value);
    } catch (e) {
        return err(ErrorBoundary.toAppError(e));
    }
}

/**
 * Centralized error handling logic
 */
export class ErrorBoundary {
    /**
     * Convert unknown error to AppError
     */
    static toAppError(unknownError: unknown): AppError {
        if (unknownError instanceof AppError) {
            return unknownError;
        }

        if (unknownError instanceof Error) {
            return new SystemError(unknownError.message, {
                originalStack: unknownError.stack,
                originalName: unknownError.name,
            });
        }

        return new SystemError(
            typeof unknownError === 'string' ? unknownError : 'Unknown error occurred',
            { originalError: unknownError }
        );
    }

    /**
     * Executed a synchronous function safely
     */
    static try<T>(fn: () => T): Result<T, AppError> {
        try {
            return ok(fn());
        } catch (e) {
            return err(this.toAppError(e));
        }
    }
}
