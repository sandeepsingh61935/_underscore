/**
 * @file mcp-bridge-client-service.ts
 * @description Outbound WebSocket client from extension background to MCP Node bridge (ADR-023).
 */

import {
  MCP_BRIDGE_STORAGE_KEYS,
  MCP_BRIDGE_WS_URL,
} from '@/shared/constants/mcp-bridge';
import { MODE_STORAGE_KEY } from '@/shared/constants/mode-storage';
import type {
  BridgeAuthMessage,
  BridgeConnectionState,
  BridgeExtensionToServerMessage,
  BridgeRequest,
  BridgeServerMessage,
} from '@/shared/mcp/bridge-protocol';
import { BRIDGE_PROTOCOL_VERSION } from '@/shared/mcp/bridge-protocol';
import type { McpBridgeHandler } from '@/background/services/mcp-bridge-handler';
import type { ILogger } from '@/shared/utils/logger';
import { browser } from 'wxt/browser';

const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 60_000;
/** Delay first connect after SW start so reload can tear down the previous socket. */
const STARTUP_CONNECT_DELAY_MS = 750;

export class McpBridgeClientService {
  private ws: WebSocket | null = null;
  private state: BridgeConnectionState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private storageListener: ((changes: Record<string, chrome.storage.StorageChange>) => void) | null = null;
  private suspendListener: (() => void) | null = null;
  private activeToken = '';
  private reconnectAttempt = 0;
  private authFailed = false;

  constructor(
    private readonly handler: McpBridgeHandler,
    private readonly logger: ILogger,
  ) {}

  private setConnectionState(state: BridgeConnectionState): void {
    this.state = state;
    void browser.storage.local.set({
      [MCP_BRIDGE_STORAGE_KEYS.connectionState]: state,
    });
  }

  getConnectionState(): BridgeConnectionState {
    return this.state;
  }

  start(): void {
    void this.syncFromStorage();
    this.storageListener = (changes) => {
      if (
        changes[MCP_BRIDGE_STORAGE_KEYS.enabled] ||
        changes[MCP_BRIDGE_STORAGE_KEYS.token] ||
        changes[MODE_STORAGE_KEY]
      ) {
        this.authFailed = false;
        this.reconnectAttempt = 0;
        void this.syncFromStorage();
      }
    };
    browser.storage.onChanged.addListener(this.storageListener);

    this.suspendListener = () => {
      this.logger.info('[McpBridge] Service worker suspending — closing bridge');
      this.stop();
    };
    browser.runtime.onSuspend.addListener(this.suspendListener);
  }

  /** Re-check Paid gate after auth changes (logout / mode no longer eligible). */
  revalidateEligibility(): void {
    this.authFailed = false;
    this.reconnectAttempt = 0;
    void this.syncFromStorage();
  }

  stop(): void {
    if (this.storageListener) {
      browser.storage.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }
    if (this.suspendListener) {
      browser.runtime.onSuspend.removeListener(this.suspendListener);
      this.suspendListener = null;
    }
    this.clearStartupTimer();
    this.clearReconnect();
    this.disconnect();
    this.activeToken = '';
    this.reconnectAttempt = 0;
  }

  private async syncFromStorage(): Promise<void> {
    const allowed = await this.handler.enforceBridgeEligibility();
    const stored = await browser.storage.local.get([
      MCP_BRIDGE_STORAGE_KEYS.enabled,
      MCP_BRIDGE_STORAGE_KEYS.token,
    ]);
    const enabled = allowed && stored[MCP_BRIDGE_STORAGE_KEYS.enabled] === true;
    const token = typeof stored[MCP_BRIDGE_STORAGE_KEYS.token] === 'string'
      ? (stored[MCP_BRIDGE_STORAGE_KEYS.token] as string).trim()
      : '';

    if (!enabled || !token) {
      this.activeToken = '';
      this.disconnect();
      return;
    }

    if (this.authFailed && token === this.activeToken) {
      return;
    }

    this.activeToken = token;
    this.scheduleConnect(token, STARTUP_CONNECT_DELAY_MS);
  }

  private scheduleConnect(token: string, delayMs: number): void {
    this.clearStartupTimer();
    this.startupTimer = setTimeout(() => {
      this.startupTimer = null;
      void browser.storage.local.get(MCP_BRIDGE_STORAGE_KEYS.enabled).then((stored) => {
        if (stored[MCP_BRIDGE_STORAGE_KEYS.enabled] === true) {
          this.connect(token);
        }
      });
    }, delayMs);
  }

  private clearStartupTimer(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
  }

  private connect(token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.disconnect();
    this.setConnectionState('connecting');
    this.logger.info('[McpBridge] Connecting', { url: MCP_BRIDGE_WS_URL });

    try {
      this.ws = new WebSocket(MCP_BRIDGE_WS_URL);
    } catch (err) {
      this.setConnectionState('error');
      this.logger.error('[McpBridge] WebSocket construct failed', err as Error);
      this.scheduleReconnect(token);
      return;
    }

    this.ws.onopen = () => {
      const auth: BridgeAuthMessage = {
        type: 'auth',
        token,
        protocolVersion: BRIDGE_PROTOCOL_VERSION,
      };
      this.ws?.send(JSON.stringify(auth));
    };

    this.ws.onmessage = (event) => {
      void this.onMessage(event.data as string);
    };

    this.ws.onerror = () => {
      this.setConnectionState('error');
    };

    this.ws.onclose = () => {
      this.setConnectionState('disconnected');
      this.ws = null;
      if (!this.authFailed) {
        this.scheduleReconnect(token);
      }
    };
  }

  private scheduleReconnect(token: string): void {
    this.clearReconnect();
    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      void browser.storage.local.get(MCP_BRIDGE_STORAGE_KEYS.enabled).then((stored) => {
        if (stored[MCP_BRIDGE_STORAGE_KEYS.enabled] === true && !this.authFailed) {
          this.connect(token);
        }
      });
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private disconnect(): void {
    this.clearReconnect();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
  }

  private async onMessage(raw: string): Promise<void> {
    let parsed: BridgeServerMessage | BridgeRequest;
    try {
      parsed = JSON.parse(raw) as BridgeServerMessage;
    } catch {
      this.logger.warn('[McpBridge] Invalid JSON from server');
      return;
    }

    if (parsed.type === 'auth_ok') {
      this.authFailed = false;
      this.reconnectAttempt = 0;
      this.setConnectionState('connected');
      this.logger.info('[McpBridge] Authenticated');
      return;
    }

    if (parsed.type === 'auth_fail') {
      this.authFailed = true;
      this.setConnectionState('error');
      this.logger.warn('[McpBridge] Auth failed', { error: parsed.error });
      this.disconnect();
      return;
    }

    if (parsed.type === 'ping') {
      this.ws?.send(JSON.stringify({ type: 'pong' }));
      return;
    }

    if (parsed.type === 'request') {
      await this.handleRequest(parsed);
    }
  }

  private async handleRequest(request: BridgeRequest): Promise<void> {
    try {
      const data = await this.handler.dispatch(request.method, request.payload);
      this.send({
        id: request.id,
        type: 'response',
        success: true,
        data,
      });
    } catch (err) {
      const error = err as Error & { code?: string };
      this.send({
        id: request.id,
        type: 'response',
        success: false,
        error: error.message ?? String(err),
        code: error.code,
      });
    }
  }

  private send(message: BridgeExtensionToServerMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}
