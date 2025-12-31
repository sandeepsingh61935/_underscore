/**
 * @file mock-logger.ts
 * @description Mock implementation of ILogger for testing
 */

import { vi } from 'vitest';
import { type ILogger, LogLevel } from '@/shared/utils/logger';

export class MockLogger implements ILogger {
    private level: LogLevel = LogLevel.INFO;

    // Spies
    debugSpy = vi.fn();
    infoSpy = vi.fn();
    warnSpy = vi.fn();
    errorSpy = vi.fn();

    debug(message: string, ...args: unknown[]): void {
        this.debugSpy(message, ...args);
    }

    info(message: string, ...args: unknown[]): void {
        this.infoSpy(message, ...args);
    }

    warn(message: string, ...args: unknown[]): void {
        this.warnSpy(message, ...args);
    }

    error(message: string, error?: Error, ...args: unknown[]): void {
        this.errorSpy(message, error, ...args);
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    getLevel(): LogLevel {
        return this.level;
    }

    reset(): void {
        this.debugSpy.mockClear();
        this.infoSpy.mockClear();
        this.warnSpy.mockClear();
        this.errorSpy.mockClear();
    }
}
