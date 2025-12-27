/**
 * @file errors.test.ts
 * @description Unit tests for error classes
 */

import { describe, it, expect } from 'vitest';
import {
    AppError,
    ValidationError,
    NotFoundError,
    StorageError,
    InternalError,
    isOperationalError,
    isAppError,
} from '@/shared/utils/errors';

describe('ValidationError', () => {
    it('should create validation error with message', () => {
        const error = new ValidationError('Invalid input');

        expect(error.message).toBe('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.isOperational).toBe(true);
    });

    it('should include context', () => {
        const context = { field: 'email', value: 'invalid' };
        const error = new ValidationError('Invalid email', context);

        expect(error.context).toEqual(context);
    });
});

describe('NotFoundError', () => {
    it('should create not found error', () => {
        const error = new NotFoundError('Highlight', '123');

        expect(error.message).toBe('Highlight with identifier 123 not found');
        expect(error.code).toBe('NOT_FOUND');
    });

    it('should provide user-friendly message', () => {
        const error = new NotFoundError('Highlight', '123');

        expect(error.toUserMessage()).toBe('The requested Highlight could not be found.');
    });
});

describe('StorageError', () => {
    it('should create storage error', () => {
        const error = new StorageError('save');

        expect(error.message).toBe('Storage operation failed: save');
        expect(error.code).toBe('STORAGE_ERROR');
    });

    it('should include cause error', () => {
        const cause = new Error('Disk full');
        const error = new StorageError('save', cause);

        expect(error.context?.cause).toBe('Disk full');
    });
});

describe('InternalError', () => {
    it('should create internal error', () => {
        const error = new InternalError('Unexpected state');

        expect(error.message).toBe('Unexpected state');
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.isOperational).toBe(false); // Programmer error
    });
});

describe('Error type guards', () => {
    it('should identify operational errors', () => {
        const operationalError = new ValidationError('Test');
        const programmingError = new InternalError('Test');

        expect(isOperationalError(operationalError)).toBe(true);
        expect(isOperationalError(programmingError)).toBe(false);
    });

    it('should identify AppError instances', () => {
        const appError = new ValidationError('Test');
        const standardError = new Error('Test');

        expect(isAppError(appError)).toBe(true);
        expect(isAppError(standardError)).toBe(false);
    });
});

describe('AppError', () => {
    it('should serialize to JSON', () => {
        const error = new ValidationError('Test error', { field: 'email' });
        const json = error.toJSON();

        expect(json).toMatchObject({
            name: 'ValidationError',
            message: 'Test error',
            code: 'VALIDATION_ERROR',
            isOperational: true,
            context: { field: 'email' },
        });
    });
});
