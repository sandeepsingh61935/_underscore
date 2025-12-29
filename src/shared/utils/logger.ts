/**
 * @file logger.ts
 * @description Logger implementation following the quality framework
 */

/**
 * Log levels (ordered by severity)
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 999,
}

/**
 * Log entry structure
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    namespace: string;
    message: string;
    metadata?: Record<string, any>;
    error?: Error;
}

/**
 * Logger interface
 */
export interface ILogger {
    debug(message: string, ...metadata: any[]): void;
    info(message: string, ...metadata: any[]): void;
    warn(message: string, ...metadata: any[]): void;
    error(message: string, error?: Error, ...metadata: any[]): void;
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements ILogger {
    private level: LogLevel;

    constructor(
        private readonly namespace: string,
        level: LogLevel = LogLevel.INFO
    ) {
        this.level = level;
    }

    debug(message: string, ...metadata: any[]): void {
        if (this.level <= LogLevel.DEBUG) {
            const entry = this.createEntry(LogLevel.DEBUG, message, metadata);
            // eslint-disable-next-line no-console
            console.debug(this.format(entry), ...metadata);
        }
    }

    info(message: string, ...metadata: any[]): void {
        if (this.level <= LogLevel.INFO) {
            const entry = this.createEntry(LogLevel.INFO, message, metadata);
            // eslint-disable-next-line no-console
            console.info(this.format(entry), ...metadata);
        }
    }

    warn(message: string, ...metadata: any[]): void {
        if (this.level <= LogLevel.WARN) {
            const entry = this.createEntry(LogLevel.WARN, message, metadata);
            console.warn(this.format(entry), ...metadata);
        }
    }

    error(message: string, error?: Error, ...metadata: any[]): void {
        if (this.level <= LogLevel.ERROR) {
            const entry = this.createEntry(LogLevel.ERROR, message, metadata, error);
            console.error(this.format(entry), error, ...metadata);

            if (error?.stack) {
                console.error('Stack trace:', error.stack);
            }
        }
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    getLevel(): LogLevel {
        return this.level;
    }

    private createEntry(
        level: LogLevel,
        message: string,
        metadata: any[],
        error?: Error
    ): LogEntry {
        return {
            timestamp: new Date(),
            level,
            namespace: this.namespace,
            message,
            metadata: metadata.length > 0 ? { data: metadata } : undefined,
            error,
        };
    }

    private format(entry: LogEntry): string {
        const level = LogLevel[entry.level];
        const timestamp = entry.timestamp.toISOString();
        return `[${timestamp}] [${level}] [${entry.namespace}] ${entry.message}`;
    }
}

/**
 * Logger factory for consistent logger creation
 */
export class LoggerFactory {
    private static defaultLevel: LogLevel = LogLevel.INFO;
    private static loggers = new Map<string, ILogger>();

    /**
     * Create or get logger for namespace
     */
    static getLogger(namespace: string): ILogger {
        if (!this.loggers.has(namespace)) {
            const logger = new ConsoleLogger(namespace, this.defaultLevel);
            this.loggers.set(namespace, logger);
        }

        return this.loggers.get(namespace)!;
    }

    /**
     * Set global log level
     */
    static setGlobalLevel(level: LogLevel): void {
        this.defaultLevel = level;

        // Update all existing loggers
        for (const logger of this.loggers.values()) {
            logger.setLevel(level);
        }
    }

    /**
     * Clear all cached loggers
     */
    static clearLoggers(): void {
        this.loggers.clear();
    }
}
