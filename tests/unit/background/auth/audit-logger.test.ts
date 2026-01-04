/**
 * @file audit-logger.test.ts
 * @description Unit tests for AuditLogger
 * @testing-strategy Mock chrome.storage, test retention and brute force detection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuditLogger } from '@/background/auth/audit-logger';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { AuthEvent, DataAccessEvent, SecurityEvent, AuditEventType } from '@/background/auth/interfaces/i-audit-logger';

// Mock chrome.storage.local
const mockStorage = new Map<string, any>();
global.chrome = {
    storage: {
        local: {
            get: vi.fn((keys) => {
                if (typeof keys === 'string') {
                    return Promise.resolve({ [keys]: mockStorage.get(keys) });
                }
                const result: Record<string, any> = {};
                Object.keys(keys).forEach(key => {
                    if (mockStorage.has(key)) {
                        result[key] = mockStorage.get(key);
                    }
                });
                return Promise.resolve(result);
            }),
            set: vi.fn((items) => {
                Object.entries(items).forEach(([key, value]) => {
                    mockStorage.set(key, value);
                });
                return Promise.resolve();
            }),
        },
    },
} as any;

describe('AuditLogger', () => {
    let auditLogger: AuditLogger;
    let mockLogger: ILogger;

    beforeEach(() => {
        mockStorage.clear();
        vi.clearAllMocks();

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        auditLogger = new AuditLogger(mockLogger);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('logAuthEvent()', () => {
        it('should log successful login', async () => {
            const event: AuthEvent = {
                action: 'LOGIN',
                userId: 'user-123',
                provider: 'google',
            };

            await auditLogger.logAuthEvent(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs).toHaveLength(1);
            expect(logs[0].type).toBe('AUTH');
            expect(logs[0].action).toBe('LOGIN');
            expect(logs[0].userId).toBe('user-123');
        });

        it('should log failed login', async () => {
            const event: AuthEvent = {
                action: 'LOGIN_FAILED',
                userId: 'user-123',
            };

            await auditLogger.logAuthEvent(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs).toHaveLength(1);
            expect(logs[0].action).toBe('LOGIN_FAILED');
        });

        it('should log logout', async () => {
            const event: AuthEvent = {
                action: 'LOGOUT',
                userId: 'user-123',
            };

            await auditLogger.logAuthEvent(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs[0].action).toBe('LOGOUT');
        });
    });

    describe('logDataAccess()', () => {
        it('should log data read', async () => {
            const event: DataAccessEvent = {
                action: 'READ',
                userId: 'user-123',
                highlightId: 'hl-456',
            };

            await auditLogger.logDataAccess(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs).toHaveLength(1);
            expect(logs[0].type).toBe('DATA_ACCESS');
            expect(logs[0].action).toBe('READ');
            expect(logs[0].metadata?.highlightId).toBe('hl-456');
        });

        it('should log data write', async () => {
            const event: DataAccessEvent = {
                action: 'WRITE',
                userId: 'user-123',
            };

            await auditLogger.logDataAccess(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs[0].action).toBe('WRITE');
        });

        it('should log data delete', async () => {
            const event: DataAccessEvent = {
                action: 'DELETE',
                userId: 'user-123',
                highlightId: 'hl-789',
            };

            await auditLogger.logDataAccess(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs[0].action).toBe('DELETE');
        });
    });

    describe('logSecurityEvent()', () => {
        it('should log brute force detection', async () => {
            const event: SecurityEvent = {
                type: 'BRUTE_FORCE',
                userId: 'user-123',
                details: {
                    attempts: 5,
                },
            };

            await auditLogger.logSecurityEvent(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs).toHaveLength(1);
            expect(logs[0].type).toBe('SECURITY');
            expect(logs[0].action).toBe('BRUTE_FORCE');
            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should log CSP violation', async () => {
            const event: SecurityEvent = {
                type: 'CSP_VIOLATION',
                details: {
                    violatedDirective: 'script-src',
                },
            };

            await auditLogger.logSecurityEvent(event);

            const logs = mockStorage.get('audit_logs');
            expect(logs[0].action).toBe('CSP_VIOLATION');
        });
    });

    describe('query()', () => {
        beforeEach(async () => {
            // Seed some logs
            await auditLogger.logAuthEvent({ action: 'LOGIN', userId: 'user-1' });
            await auditLogger.logAuthEvent({ action: 'LOGIN', userId: 'user-2' });
            await auditLogger.logDataAccess({ action: 'READ', userId: 'user-1' });
        });

        it('should filter by userId', async () => {
            const results = await auditLogger.query({ userId: 'user-1' });

            expect(results).toHaveLength(2);
            expect(results.every(log => log.userId === 'user-1')).toBe(true);
        });

        it('should filter by type', async () => {
            const results = await auditLogger.query({ type: 'AUTH' as AuditEventType });

            expect(results).toHaveLength(2);
            expect(results.every(log => log.type === 'AUTH')).toBe(true);
        });

        it('should filter by date range', async () => {
            const startDate = new Date(Date.now() - 1000);
            const endDate = new Date(Date.now() + 1000);

            const results = await auditLogger.query({ startDate, endDate });

            expect(results).toHaveLength(3);
        });

        it('should return empty array if no matches', async () => {
            const results = await auditLogger.query({ userId: 'non-existent' });

            expect(results).toHaveLength(0);
        });
    });

    describe('Retention Policy', () => {
        it('should remove logs older than 90 days', async () => {
            // Mock old timestamp (91 days ago)
            const oldTimestamp = Date.now() - (91 * 24 * 60 * 60 * 1000);

            // Manually insert old log
            mockStorage.set('audit_logs', [{
                id: 'old-log',
                type: 'AUTH',
                action: 'LOGIN',
                userId: 'user-old',
                timestamp: oldTimestamp,
            }]);

            // Add new log (should trigger cleanup)
            await auditLogger.logAuthEvent({ action: 'LOGIN', userId: 'user-new' });

            const logs = mockStorage.get('audit_logs');

            // Old log should be removed
            expect(logs.find((l: any) => l.id === 'old-log')).toBeUndefined();
            expect(logs.find((l: any) => l.userId === 'user-new')).toBeDefined();
        });

        it('should keep logs within 90-day window', async () => {
            // Mock recent timestamp (30 days ago)
            const recentTimestamp = Date.now() - (30 * 24 * 60 * 60 * 1000);

            mockStorage.set('audit_logs', [{
                id: 'recent-log',
                type: 'AUTH',
                action: 'LOGIN',
                userId: 'user-recent',
                timestamp: recentTimestamp,
            }]);

            await auditLogger.logAuthEvent({ action: 'LOGIN', userId: 'user-new' });

            const logs = mockStorage.get('audit_logs');

            // Recent log should be kept
            expect(logs.find((l: any) => l.id === 'recent-log')).toBeDefined();
        });
    });

    describe('Brute Force Detection', () => {
        it('should detect brute force after 5 failed logins', async () => {
            const userId = 'attacker-123';

            // Simulate 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await auditLogger.logAuthEvent({
                    action: 'LOGIN_FAILED',
                    userId,
                });
            }

            // Check that brute force was logged
            const logs = mockStorage.get('audit_logs');
            const bruteForceLog = logs.find((l: any) => l.action === 'BRUTE_FORCE');

            expect(bruteForceLog).toBeDefined();
            expect(bruteForceLog.userId).toBe(userId);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Brute force'),
                expect.any(Error),
                expect.objectContaining({ userId })
            );
        });

        it('should not trigger brute force for successful logins', async () => {
            const userId = 'user-123';

            // 5 successful logins
            for (let i = 0; i < 5; i++) {
                await auditLogger.logAuthEvent({
                    action: 'LOGIN',
                    userId,
                });
            }

            const logs = mockStorage.get('audit_logs');
            const bruteForceLog = logs.find((l: any) => l.action === 'BRUTE_FORCE');

            expect(bruteForceLog).toBeUndefined();
        });

        it('should only count failed logins within 15-minute window', async () => {
            const userId = 'user-123';

            // Mock old failed login (20 minutes ago)
            const oldTimestamp = Date.now() - (20 * 60 * 1000);
            mockStorage.set('audit_logs', [{
                id: 'old-fail',
                type: 'AUTH',
                action: 'LOGIN_FAILED',
                userId,
                timestamp: oldTimestamp,
            }]);

            // 4 recent failed logins (should not trigger brute force)
            for (let i = 0; i < 4; i++) {
                await auditLogger.logAuthEvent({
                    action: 'LOGIN_FAILED',
                    userId,
                });
            }

            const logs = mockStorage.get('audit_logs');
            const bruteForceLog = logs.find((l: any) => l.action === 'BRUTE_FORCE');

            // Should not trigger (old login outside window)
            expect(bruteForceLog).toBeUndefined();
        });
    });
});
