/**
 * @file validation.ts
 * @description Runtime validation utilities using Zod
 * 
 * Provides safe validation with detailed error reporting
 */

import type { z } from 'zod';
import { ZodError } from 'zod';

import { LoggerFactory } from '../utils/logger';
import type { ILogger } from '../utils/logger';

const logger: ILogger = LoggerFactory.getLogger('Validation');

/**
 * Validation error with context
 */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly zodError: ZodError,
        public readonly data: unknown,
        public readonly context?: string
    ) {
        super(message);
        this.name = 'ValidationError';

        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }
    }

    /**
     * Get formatted error details
     */
    getDetails(): string[] {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this.zodError as any).errors.map((err: any) => {
            const path = err.path.join('.');
            return `${path}: ${err.message}`;
        });
    }

    /**
     * Convert to JSON for logging
     */
    toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            context: this.context,
            errors: this.getDetails(),
            data: this.data
        };
    }
}

/**
 * Validate data against schema with detailed error logging
 * Throws ValidationError on failure
 */
export function validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: string
): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            logger.error('Validation failed', undefined, {
                context,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                errors: (error as any).errors,
                data
            });

            throw new ValidationError(
                `Validation failed${context ? ` for ${context}` : ''}`,
                error,
                data,
                context
            );
        }
        throw error;
    }
}

/**
 * Safe validation - returns null on failure instead of throwing
 * Use when validation failure should not interrupt flow
 */
export function validateSafe<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: string
): T | null {
    const result = schema.safeParse(data);

    if (!result.success) {
        logger.warn('Validation failed (safe mode)', {
            context,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            errors: (result.error as any).errors,
            data
        });
        return null;
    }

    return result.data;
}

/**
 * Validate array of data, filtering out invalid items
 * Returns only valid items
 */
export function validateArray<T>(
    schema: z.ZodSchema<T>,
    dataArray: unknown[],
    context?: string
): T[] {
    const valid: T[] = [];
    const invalid: unknown[] = [];

    dataArray.forEach((item, index) => {
        const result = schema.safeParse(item);
        if (result.success) {
            valid.push(result.data);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            invalid.push({ index, item, errors: (result.error as any).errors });
        }
    });

    if (invalid.length > 0) {
        logger.warn('Some items failed validation', {
            context,
            validCount: valid.length,
            invalidCount: invalid.length,
            invalid
        });
    }

    return valid;
}

/**
 * Type guard to check if data matches schema
 */
export function isValid<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): data is T {
    return schema.safeParse(data).success;
}
