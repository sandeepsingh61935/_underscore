/**
 * WebSocket JSON protocol between MCP Node bridge server and extension background.
 */

export const BRIDGE_PROTOCOL_VERSION = 1 as const;

export type BridgeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface BridgeRequest {
  id: string;
  type: 'request';
  method: string;
  payload?: unknown;
}

export interface BridgeResponse {
  id: string;
  type: 'response';
  success: boolean;
  data?: unknown;
  error?: string;
  code?: string;
}

export interface BridgeAuthMessage {
  type: 'auth';
  token: string;
  protocolVersion: typeof BRIDGE_PROTOCOL_VERSION;
}

export interface BridgeAuthOkMessage {
  type: 'auth_ok';
}

export interface BridgeAuthFailMessage {
  type: 'auth_fail';
  error: string;
}

export interface BridgePingMessage {
  type: 'ping';
}

export interface BridgePongMessage {
  type: 'pong';
}

/** Messages sent from MCP bridge server to extension. */
export type BridgeServerMessage =
  | BridgeRequest
  | BridgeResponse
  | BridgeAuthOkMessage
  | BridgeAuthFailMessage
  | BridgePingMessage;

/** Messages sent from extension to MCP bridge server. */
export type BridgeExtensionToServerMessage =
  | BridgeRequest
  | BridgeAuthMessage
  | BridgePongMessage
  | BridgeResponse;

export function isBridgeRequest(msg: { type?: string; id?: string; method?: string }): msg is BridgeRequest {
  return msg.type === 'request' && typeof msg.id === 'string' && typeof msg.method === 'string';
}
