/**
 * Message Type Definitions
 *
 * Type-safe message definitions for IPC between Popup ↔ Content Script
 */

import type { ModeType } from '@/content/modes/mode-state-manager';

export type Message =
  | { type: 'GET_MODE' }
  | { type: 'SET_MODE'; mode: ModeType }
  | { type: 'MODE_CHANGED'; mode: ModeType }
  | { type: 'GET_HIGHLIGHT_COUNT' }
  | { type: 'HIGHLIGHT_COUNT_UPDATE'; count: number };

export type MessageResponse =
  | { mode: ModeType }
  | { count: number }
  | { success: boolean }
  | { error: string };
