/**
 * @file app-error.test.ts
 * @description Unit tests for AppError hierarchy
 */

import { describe, it, expect } from 'vitest';
import {
    AppError,
    ModeError,
    ValidationError,
    PersistenceError,
    MessagingError,
    SystemError
} from '@/shared/errors/app-error';

describe('AppError Hierarchy (8 tests)', () => {

    it('1. AppError captures message and context', () => {
        const err = new AppError('Something wrong', { foo: 'bar' });

        expect(err.message).toBe('Something wrong');
        expect(err.context).toEqual({ foo: 'bar' });
        expect(err.name).toBe('AppError');
        expect(err.isOperational).toBe(true); // Default
    });

    it('2. Subclasses pass instanceOf checks', () => {
        const err = new ModeError('Invalid state');

        expect(err).toBeInstanceOf(AppError);
        expect(err).toBeInstanceOf(ModeError);
        expect(err).toBeInstanceOf(Error);
    });

    it('3. Subclasses have correct names', () => {
        expect(new ModeError('msg').name).toBe('ModeError');
        expect(new ValidationError('msg').name).toBe('ValidationError');
        expect(new PersistenceError('msg').name).toBe('PersistenceError');
    });

    it('4. SystemError is non-operational', () => {
        const err = new SystemError('Bug detected');
        expect(err.isOperational).toBe(false);
    });

    it('5. Validation uses default operational=true', () => {
        const err = new ValidationError('Bad input');
        expect(err.isOperational).toBe(true);
    });

    it('6. Errors are serializable toJSON', () => {
        const err = new AppError('Serializable', { id: 123 });
        const json = err.toJSON() as any;

        expect(json.name).toBe('AppError');
        expect(json.message).toBe('Serializable');
        expect(json.context).toEqual({ id: 123 });
        expect(json.isOperational).toBe(true);
        expect(json.stack).toBeDefined();
    });

    it('7. Stack trace is captured', () => {
        function throwIt() {
            throw new ModeError('Stack check');
        }

        try {
            throwIt();
        } catch (e) {
            expect((e as Error).stack).toContain('throwIt');
        }
    });

    it('8. Can extend with custom context', () => {
        const err = new PersistenceError('DB Fail', {
            table: 'highlights',
            queryId: 'abc'
        });

        expect(err.context?.table).toBe('highlights');
    });
});
