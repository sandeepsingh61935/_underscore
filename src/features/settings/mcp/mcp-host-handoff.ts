/**
 * Pure host handoff helpers for Integrations (PRD 2026-08-14).
 * Settings never starts OAuth; hosts register the Cloud MCP URL and run OAuth.
 */

import type { McpAiAppDef } from '@/features/settings/mcp/mcp-ai-apps';

export type HandoffKind = 'deep_link' | 'copy_command' | 'copy_url';

export type PrimaryHandoffAction =
  | { kind: 'deep_link'; label: string; href: string }
  | { kind: 'copy_command'; label: string; text: string }
  | { kind: 'copy_url'; label: string; text: string };

/** Base64-encode JSON for Cursor MCP install deep links (ASCII config only). */
export function encodeJsonBase64(value: unknown): string {
  const json = JSON.stringify(value);
  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(json);
  }
  // Node / Vitest without btoa
  return Buffer.from(json, 'utf8').toString('base64');
}

/** Decode base64 JSON produced by encodeJsonBase64 (tests / diagnostics). */
export function decodeJsonBase64<T = unknown>(encoded: string): T {
  let json: string;
  if (typeof globalThis.atob === 'function') {
    json = globalThis.atob(encoded);
  } else {
    json = Buffer.from(encoded, 'base64').toString('utf8');
  }
  return JSON.parse(json) as T;
}

/**
 * Cursor install deep link: name + base64 config with remote URL only (no token).
 * @see https://cursor.com/docs/mcp/install-links
 */
export function buildCursorMcpInstallLink(
  name: string,
  remoteUrl: string,
): string {
  const config = encodeJsonBase64({ url: remoteUrl.trim() });
  const params = new URLSearchParams({
    name: name.trim() || '_underscore',
    config,
  });
  return `cursor://anysphere.cursor-deeplink/mcp/install?${params.toString()}`;
}

export function fillCommandTemplate(template: string, url: string): string {
  return template.split('{{MCP_URL}}').join(url.trim());
}

export function resolvePrimaryAction(
  app: McpAiAppDef,
  remoteUrl: string,
): PrimaryHandoffAction {
  const url = remoteUrl.trim();
  switch (app.handoff) {
    case 'deep_link': {
      const href =
        app.id === 'cursor'
          ? buildCursorMcpInstallLink('_underscore', url)
          : buildCursorMcpInstallLink(app.id, url);
      return { kind: 'deep_link', label: app.primaryLabel, href };
    }
    case 'copy_command': {
      const template = app.commandTemplate ?? 'echo {{MCP_URL}}';
      return {
        kind: 'copy_command',
        label: app.primaryLabel,
        text: fillCommandTemplate(template, url),
      };
    }
    case 'copy_url':
      return { kind: 'copy_url', label: app.primaryLabel, text: url };
  }
}

/** Picker row subline from handoff kind (expectation before setup). */
export function handoffPickerSub(handoff: HandoffKind): string {
  switch (handoff) {
    case 'deep_link':
      return 'IDE · one-click install';
    case 'copy_command':
      return 'CLI · one command';
    case 'copy_url':
      return 'Paste URL in host settings';
  }
}
