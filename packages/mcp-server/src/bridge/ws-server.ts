import { WebSocketServer, type WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { MCP_BRIDGE_HOST, MCP_BRIDGE_PORT } from '../constants/bridge.js';

interface BridgeRequest {
  id: string;
  type: 'request';
  method: string;
  payload?: unknown;
}

interface BridgeResponse {
  id: string;
  type: 'response';
  success: boolean;
  data?: unknown;
  error?: string;
  code?: string;
}

interface PendingRequest {
  resolve: (value: BridgeResponse) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 30_000;

export class ExtensionBridgeWsServer {
  private wss: WebSocketServer | null = null;
  private extensionSocket: WebSocket | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly expectedToken: string;

  constructor(token: string) {
    this.expectedToken = token;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({ host: MCP_BRIDGE_HOST, port: MCP_BRIDGE_PORT });

      this.wss.on('listening', () => {
        console.error(`[underscore-mcp] Bridge listening on ws://${MCP_BRIDGE_HOST}:${MCP_BRIDGE_PORT}`);
        resolve();
      });

      this.wss.on('error', (err) => {
        reject(err);
      });

      this.wss.on('connection', (socket) => {
        let authed = false;

        socket.on('message', (raw) => {
          let parsed: { type?: string; token?: string; protocolVersion?: number };
          try {
            parsed = JSON.parse(String(raw)) as typeof parsed;
          } catch {
            socket.close();
            return;
          }

          if (!authed) {
            if (parsed.type !== 'auth' || parsed.token !== this.expectedToken) {
              socket.send(JSON.stringify({ type: 'auth_fail', error: 'Invalid token' }));
              socket.close();
              return;
            }
            authed = true;
            if (this.extensionSocket && this.extensionSocket !== socket) {
              this.extensionSocket.close();
            }
            this.extensionSocket = socket;
            socket.send(JSON.stringify({ type: 'auth_ok' }));
            return;
          }

          if (parsed.type === 'pong') {
            return;
          }

          const response = parsed as BridgeResponse;
          if (response.type === 'response' && response.id) {
            const pending = this.pending.get(response.id);
            if (pending) {
              clearTimeout(pending.timer);
              this.pending.delete(response.id);
              pending.resolve(response);
            }
          }
        });

        socket.on('close', () => {
          if (this.extensionSocket === socket) {
            this.extensionSocket = null;
          }
        });
      });

      setInterval(() => {
        if (this.extensionSocket?.readyState === 1) {
          this.extensionSocket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30_000);
    });
  }

  isExtensionConnected(): boolean {
    return this.extensionSocket?.readyState === 1;
  }

  async call(method: string, payload?: unknown): Promise<unknown> {
    if (!this.extensionSocket || this.extensionSocket.readyState !== 1) {
      throw Object.assign(new Error('Extension bridge not connected. Enable MCP in Settings and paste matching token.'), {
        code: 'BRIDGE_DISCONNECTED',
      });
    }

    const id = randomUUID();
    const request: BridgeRequest = { id, type: 'request', method, payload };

    const response = await new Promise<BridgeResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Bridge request timed out: ${method}`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      this.extensionSocket!.send(JSON.stringify(request));
    });

    if (!response.success) {
      throw Object.assign(new Error(response.error ?? 'Bridge request failed'), { code: response.code });
    }

    return response.data;
  }

  stop(): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Bridge server stopped'));
    }
    this.pending.clear();
    this.extensionSocket?.close();
    this.wss?.close();
  }
}
