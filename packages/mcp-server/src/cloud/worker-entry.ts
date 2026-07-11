import { handleMcpRequest, type McpWorkerEnv } from './worker.js';

export interface Env extends McpWorkerEnv {}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleMcpRequest(request, env);
  },
};
