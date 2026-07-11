export type McpDataCoverage = 'basic_local' | 'pro_local' | 'pro_cloud';

export interface McpAdapter {
  readonly name: 'bridge' | 'cloud';
  readonly dataCoverage: McpDataCoverage;
  dispatch(method: string, payload?: unknown): Promise<unknown>;
  isReady(): boolean;
}
