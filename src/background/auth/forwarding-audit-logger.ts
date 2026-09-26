/**
 * @file forwarding-audit-logger.ts
 * @description IAuditLogger decorator: durable local log first, then
 * best-effort forward of auth/security events to the server sink.
 * Data-access events and queries stay local-only.
 */

import type {
  AuditLogEntry,
  AuthEvent,
  AuditEventType,
  DataAccessEvent,
  IAuditLogger,
  SecurityEvent,
} from './interfaces/i-audit-logger';
import type { ServerAuditSink } from './server-audit-sink';

export class ForwardingAuditLogger implements IAuditLogger {
  constructor(
    private readonly inner: IAuditLogger,
    private readonly sink: ServerAuditSink
  ) {}

  async logAuthEvent(event: AuthEvent): Promise<void> {
    await this.inner.logAuthEvent(event);
    // Fail-open: sink never throws; rejection here must not break auth.
    await this.sink.forward(event.action, event.userId, event.provider);
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    await this.inner.logSecurityEvent(event);
    // BRUTE_FORCE and other security signals are only meaningful server-side
    // when tied to a session; forward best-effort keyed by user when known.
    if (event.userId) {
      await this.sink.forward('LOGIN_FAILED', event.userId, event.type);
    }
  }

  async logDataAccess(event: DataAccessEvent): Promise<void> {
    await this.inner.logDataAccess(event);
  }

  async query(filter: {
    userId?: string;
    type?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]> {
    return this.inner.query(filter);
  }
}
