import type { McpAdapter } from './types.js';
import type { ExtensionBridgeWsServer } from '../bridge/ws-server.js';

export class BridgeMcpAdapter implements McpAdapter {
  readonly name = 'bridge' as const;
  readonly dataCoverage = 'pro_local' as const;

  constructor(private readonly bridge: ExtensionBridgeWsServer) {}

  isReady(): boolean {
    return this.bridge.isExtensionConnected();
  }

  async dispatch(method: string, payload?: unknown): Promise<unknown> {
    return this.bridge.call(method, payload);
  }
}
