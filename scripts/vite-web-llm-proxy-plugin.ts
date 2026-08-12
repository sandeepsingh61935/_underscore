/**
 * Vite dev middleware: same-origin /api/llm/* using ADR-027 proxy handlers.
 * Production uses Cloudflare Pages Functions under functions/api/llm/.
 *
 * Handlers are loaded via Vite SSR module graph so `@/` aliases resolve.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { Plugin, ViteDevServer } from 'vite';

const LLM_PROXY_STREAM_PATH = '/api/llm/stream';
const LLM_PROXY_HEALTH_PATH = '/api/llm/health';

type ProxyEnv = {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

type ProxyHandlers = {
  handleLlmStreamProxy: (req: Request, env: ProxyEnv) => Promise<Response>;
  handleLlmHealthProxy: (req: Request, env: ProxyEnv) => Promise<Response>;
};

function proxyEnvFromProcess(): ProxyEnv {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  };
}

function toFetchHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

async function toFetchRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? 'localhost';
  const url = new URL(req.url ?? '/', `http://${host}`);
  const method = (req.method ?? 'GET').toUpperCase();
  const headers = toFetchHeaders(req);

  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method, headers });
  }

  const body = await readRequestBody(req);
  return new Request(url, {
    method,
    headers,
    body: body.length > 0 ? new Uint8Array(body) : undefined,
  });
}

async function writeFetchResponse(
  webRes: Response,
  res: ServerResponse,
): Promise<void> {
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return;
    res.setHeader(key, value);
  });

  if (!webRes.body) {
    res.end();
    return;
  }

  const nodeStream = Readable.fromWeb(
    webRes.body as import('node:stream/web').ReadableStream,
  );
  await new Promise<void>((resolve, reject) => {
    nodeStream.on('error', reject);
    res.on('error', reject);
    res.on('finish', resolve);
    res.on('close', resolve);
    nodeStream.pipe(res);
  });
}

function isLlmProxyPath(pathname: string): boolean {
  return pathname === LLM_PROXY_STREAM_PATH || pathname === LLM_PROXY_HEALTH_PATH;
}

async function loadHandlers(server: ViteDevServer): Promise<ProxyHandlers> {
  const mod = (await server.ssrLoadModule(
    '/src/shared/llm/runtime/proxy-handlers.ts',
  )) as ProxyHandlers;
  return mod;
}

/**
 * Mount ADR-027 LLM proxy on the Vite dev server (same handlers as Pages Functions).
 */
export function viteWebLlmProxyPlugin(): Plugin {
  return {
    name: 'underscore-web-llm-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void (async () => {
          try {
            const host = req.headers.host ?? 'localhost';
            const pathname = new URL(req.url ?? '/', `http://${host}`).pathname;
            if (!isLlmProxyPath(pathname)) {
              next();
              return;
            }

            const request = await toFetchRequest(req);
            const env = proxyEnvFromProcess();
            if (!env.SUPABASE_URL && !env.VITE_SUPABASE_URL) {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    'LLM proxy: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (e.g. .env.development)',
                }),
              );
              return;
            }

            const handlers = await loadHandlers(server);
            const webRes =
              pathname === LLM_PROXY_STREAM_PATH
                ? await handlers.handleLlmStreamProxy(request, env)
                : await handlers.handleLlmHealthProxy(request, env);

            await writeFetchResponse(webRes, res);
          } catch (err) {
            if (res.headersSent) {
              res.destroy(err instanceof Error ? err : undefined);
              return;
            }
            next(err);
          }
        })();
      });

      const env = proxyEnvFromProcess();
      const hasSb = Boolean(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
      server.config.logger.info(
        hasSb
          ? `[llm-proxy] ${LLM_PROXY_STREAM_PATH} + ${LLM_PROXY_HEALTH_PATH} (dev, same handlers as Pages Functions)`
          : `[llm-proxy] mounted but Supabase env missing — set VITE_SUPABASE_* in .env.development`,
      );
    },
  };
}
