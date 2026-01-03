/**
 * @file i-audit-logger.ts
 * @description Audit logging interface for security compliance
 * @compliance GDPR Article 32 (security monitoring)
 */

/**
 * Audit log entry types
 */
export enum AuditEventType {
    AUTH = 'AUTH',
    DATA_ACCESS = 'DATA_ACCESS',
    SECURITY = 'SECURITY',
}

/**
 * Authentication audit event
 */
export interface AuthEvent {
    readonly action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'TOKEN_REFRESH';
    readonly userId: string;
    readonly provider?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Data access audit event
 */
export interface DataAccessEvent {
    readonly action: 'READ' | 'WRITE' | 'DELETE';
    readonly userId: string;
    readonly highlightId?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Security audit event
 */
export interface SecurityEvent {
    readonly type: 'BRUTE_FORCE' | 'CSP_VIOLATION' | 'SUSPICIOUS_ACTIVITY';
    readonly userId?: string;
    readonly details: Record<string, unknown>;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
    readonly id: string;
    readonly type: AuditEventType;
    readonly action: string;
    readonly userId?: string;
    readonly timestamp: number;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Audit logger interface
 *
 * @responsibility Log security-relevant events for compliance
 * @retention 90 days
 * @compliance GDPR Article 32
 */
export interface IAuditLogger {
    /**
     * Log authentication event
     *
     * @param event - Auth event to log
     * @returns Promise that resolves when logged
     */
    logAuthEvent(event: AuthEvent): Promise<void>;

    /**
     * Log data access event
     *
     * @param event - Data access event to log
     * @returns Promise that resolves when logged
     */
    logDataAccess(event: DataAccessEvent): Promise<void>;

    /**
     * Log security event
     *
     * @param event - Security event to log
     * @returns Promise that resolves when logged
     */
    logSecurityEvent(event: SecurityEvent): Promise<void>;

    /**
     * Query audit logs
     *
     * @param filter - Filter criteria
     * @returns Matching log entries
     */
    query(filter: {
        userId?: string;
        type?: AuditEventType;
        startDate?: Date;
        endDate?: Date;
    }): Promise<AuditLogEntry[]>;
}
