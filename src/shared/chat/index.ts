export type {
  AppendMessageInput,
  ChatMessage,
  ChatMessageRole,
  ChatMessageStatus,
  ChatScope,
  ChatScopeKind,
  ChatThread,
  CreateThreadInput,
  FinalizeMessagePatch,
  MessageWriteResult,
  UpdateThreadPatch,
} from './types';
export { CHAT_QUOTAS, ChatQuotaError } from './types';

export {
  parseChatScope,
  scopeDomain,
  scopeKind,
  scopeKindForPrompt,
  scopeLabel,
  scopeSectionKey,
  scopesEqual,
} from './chat-scope';

export { autoTitleFromUserMessage } from './chat-title';

export {
  assembleChatRequest,
  selectContextMessages,
  type AssembleChatRequestInput,
} from './context-assembler';

export {
  CHAT_MESSAGES_TABLE,
  CHAT_THREADS_TABLE,
  type IChatRepository,
} from './i-chat-repository';

export { SupabaseChatRepository } from './supabase-chat-repository';
export { CachedChatRepository } from './cached-chat-repository';
export {
  IndexedDbChatCache,
  MemoryChatCache,
  type IChatCache,
} from './indexeddb-chat-cache';

export {
  ChatService,
  type BeginTurnInput,
  type BeginTurnResult,
  type FinalizeTurnInput,
} from './chat-service';

export {
  createChatCache,
  createChatService,
} from './create-chat-service';

export {
  runGroundedTurn,
  type RunGroundedTurnInput,
  type RunGroundedTurnResult,
  type TurnOutcome,
} from './run-grounded-turn';
