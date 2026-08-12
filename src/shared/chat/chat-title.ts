import { CHAT_QUOTAS } from './types';

/** Auto-title from the first user message (ADR-028 UX). */
export function autoTitleFromUserMessage(
  content: string,
  maxChars: number = CHAT_QUOTAS.titleMaxChars,
): string {
  const collapsed = content.replace(/\s+/g, ' ').trim();
  if (!collapsed) return 'New chat';
  if (collapsed.length <= maxChars) return collapsed;
  const cut = collapsed.slice(0, maxChars - 1).trimEnd();
  return `${cut}…`;
}
