/**
 * @file i-realtime-highlight-ingest-service.ts
 */

export interface RealtimeIngestStats {
  applied: number;
  skippedEcho: number;
  skippedStale: number;
  removed: number;
  failed: number;
}

export interface IRealtimeHighlightIngestService {
  initialize(): void;
}
