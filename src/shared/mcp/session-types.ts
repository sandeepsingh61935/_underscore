import type { HighlightStorageScope } from '@/shared/constants/highlight-storage-scope';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

export type McpDataCoverage = 'basic_local' | 'pro_local' | 'pro_cloud';

export interface McpSessionCapabilities {
  sync: boolean;
  export: boolean;
  ai: boolean;
  collections: boolean;
  search: boolean;
  metadataWrite: boolean;
}

export interface McpSessionSnapshot {
  mode: ModeType;
  displayName: string;
  storageScope: HighlightStorageScope;
  auth: {
    signedIn: boolean;
    userId?: string;
    email?: string;
  };
  capabilities: McpSessionCapabilities;
  sync?: {
    lastHydratedAt?: string;
    error?: string;
  };
  dataCoverage: McpDataCoverage;
  bridgeConnected?: boolean;
}
