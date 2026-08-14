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
  scopeProjectId,
  scopeSectionKey,
  scopesEqual,
} from './chat-scope';

export {
  placeLabel,
  placesEqual,
  placeToScope,
  scopeToPlace,
  type Place,
} from './place';

export {
  membersEqual,
  PROJECT_QUOTAS,
  summarizeMembers,
  type ChatProject,
  type ProjectMember,
} from './project-types';

export { highlightsForPlace, type PlaceHighlight } from './highlights-for-place';

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

export {
  CHAT_PROJECT_MEMBERS_TABLE,
  CHAT_PROJECTS_TABLE,
  type CreateProjectInput,
  type IProjectRepository,
} from './i-project-repository';

export { SupabaseChatRepository } from './supabase-chat-repository';
export { CachedChatRepository } from './cached-chat-repository';
export { MemoryChatRepository } from './memory-chat-repository';
export { MemoryProjectRepository } from './memory-project-repository';
export { SupabaseProjectRepository } from './supabase-project-repository';
export { ProjectService } from './project-service';
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
