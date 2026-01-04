/**
 * @file audit-logger.ts
 * @description Audit logging implementation for security compliance
 * @compliance GDPR Article 32 (security monitoring)
 */

import type {
    IAuditLogger,
    AuditEventType,
    AuthEvent,
    DataAccessEvent,
    SecurityEvent,
    AuditLogEntry,
} from './interfaces/i-audit-logger';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Audit Logger Implementation
 * 
 * @security Logs all security-relevant events
 * @retention 90 days (auto-cleanup)
 * @storage chrome.storage.local
 */
export class AuditLogger implements IAuditLogger {
    private readonly STORAGE_KEY = 'audit_logs';
    private readonly RETENTION_DAYS = 90;
    private readonly MAX_LOGS = 10000; // Prevent unbounded growth
    private readonly BRUTE_FORCE_THRESHOLD = 5; // Failed logins
    private readonly BRUTE_FORCE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    constructor(private readonly logger: ILogger) { }

    /**
     * Log authentication event
     */
    async logAuthEvent(event: AuthEvent): Promise<void> {
        const entry: AuditLogEntry = {
            id: this.generateId(),
            type: 'AUTH' as AuditEventType,
            action: event.action,
            userId: event.userId,
            timestamp: Date.now(),
            metadata: {
                provider: event.provider,
                ...event.metadata,
            },
        };

        await this.storeEntry(entry);

        // Check for brute force attacks
        if (event.action === 'LOGIN_FAILED') {
            await this.checkBruteForce(event.userId);
        }

        this.logger.debug('Auth event logged', { action: event.action, userId: event.userId });
    }

    /**
     * Log data access event
     */
    async logDataAccess(event: DataAccessEvent): Promise<void> {
        const entry: AuditLogEntry = {
            id: this.generateId(),
            type: 'DATA_ACCESS' as AuditEventType,
            action: event.action,
            userId: event.userId,
            timestamp: Date.now(),
            metadata: {
                highlightId: event.highlightId,
                ...event.metadata,
            },
        };

        await this.storeEntry(entry);

        this.logger.debug('Data access logged', { action: event.action, userId: event.userId });
    }

    /**
     * Log security event
     */
    async logSecurityEvent(event: SecurityEvent): Promise<void> {
        const entry: AuditLogEntry = {
            id: this.generateId(),
            type: 'SECURITY' as AuditEventType,
            action: event.type,
            userId: event.userId,
            timestamp: Date.now(),
            metadata: event.details,
        };

        await this.storeEntry(entry);

        this.logger.warn('Security event logged', { type: event.type, userId: event.userId });
    }

    /**
     * Query audit logs
     */
    async query(filter: {
        userId?: string;
        type?: AuditEventType;
        startDate?: Date;
        endDate?: Date;
    }): Promise<AuditLogEntry[]> {
        const logs = await this.loadLogs();

        return logs.filter(log => {
            if (filter.userId && log.userId !== filter.userId) return false;
            if (filter.type && log.type !== filter.type) return false;
            if (filter.startDate && log.timestamp < filter.startDate.getTime()) return false;
            if (filter.endDate && log.timestamp > filter.endDate.getTime()) return false;
            return true;
        });
    }

    /**
     * Store audit log entry
     */
    private async storeEntry(entry: AuditLogEntry): Promise<void> {
        const logs = await this.loadLogs();

        // Add new entry
        logs.push(entry);

        // Cleanup old entries (90-day retention)
        const cutoffTime = Date.now() - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const filteredLogs = logs.filter(log => log.timestamp > cutoffTime);

        // Limit total logs
        const trimmedLogs = filteredLogs.slice(-this.MAX_LOGS);

        // Save
        await chrome.storage.local.set({ [this.STORAGE_KEY]: trimmedLogs });
    }

    /**
     * Load audit logs from storage
     */
    private async loadLogs(): Promise<AuditLogEntry[]> {
        const result = await chrome.storage.local.get(this.STORAGE_KEY);
        return result[this.STORAGE_KEY] || [];
    }

    /**
     * Check for brute force attacks
     */
    private async checkBruteForce(userId: string): Promise<void> {
        const recentLogs = await this.query({
            userId,
            type: 'AUTH' as AuditEventType,
            startDate: new Date(Date.now() - this.BRUTE_FORCE_WINDOW_MS),
        });

        const failedLogins = recentLogs.filter(log => log.action === 'LOGIN_FAILED');

        if (failedLogins.length >= this.BRUTE_FORCE_THRESHOLD) {
            // Log brute force detection
            await this.logSecurityEvent({
                type: 'BRUTE_FORCE',
                userId,
                details: {
                    failedAttempts: failedLogins.length,
                    windowMs: this.BRUTE_FORCE_WINDOW_MS,
                    threshold: this.BRUTE_FORCE_THRESHOLD,
                },
            });

            this.logger.error('Brute force attack detected', new Error('Too many failed login attempts'), {
                userId,
                attempts: failedLogins.length,
            });

            // TODO: Lock account or implement rate limiting
        }
    }

    /**
     * Generate unique ID for log entry
     */
    private generateId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
