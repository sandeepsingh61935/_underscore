import { useCallback, useRef, useState } from 'react';

import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import type { PromptHighlight, PromptTemplateName } from '@/shared/llm/prompts';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

interface StartArgs {
  template: PromptTemplateName;
  highlights: PromptHighlight[];
  request: LLMRequest;
  provider?: ProviderName;
}

interface StreamChunkMessage {
  type: 'CHUNK';
  payload: { delta: string };
}

interface StreamDoneMessage {
  type: 'DONE';
  payload: unknown;
}

interface StreamErrorMessage {
  type: 'ERROR';
  payload: { message?: string };
}

type StreamMessage = StreamChunkMessage | StreamDoneMessage | StreamErrorMessage;

interface StreamingPort {
  postMessage: (msg: unknown) => void;
  onMessage: { addListener: (cb: (msg: StreamMessage) => void) => void };
  onDisconnect: { addListener: (cb: () => void) => void };
  disconnect: () => void;
}

export function useLLMStream(): {
  chunks: string;
  status: StreamStatus;
  error: string | null;
  start: (args: StartArgs) => void;
  abort: () => void;
} {
  const portRef = useRef<StreamingPort | null>(null);
  const [chunks, setChunks] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback((args: StartArgs) => {
    setChunks(''); setError(null); setStatus('streaming');
    const port = chrome.runtime.connect({ name: 'llm-stream' }) as unknown as StreamingPort;
    portRef.current = port;

    port.onMessage.addListener((msg: StreamMessage) => {
      if (msg.type === 'CHUNK' && msg.payload.delta) {
        setChunks(c => c + msg.payload.delta);
      } else if (msg.type === 'DONE') setStatus('done');
      else if (msg.type === 'ERROR') { setStatus('error'); setError(msg.payload.message ?? 'unknown'); }
    });

    port.postMessage({ type: 'STREAM_CHAT_REQUEST', payload: args });
  }, []);

  const abort = useCallback(() => {
    portRef.current?.disconnect();
    portRef.current = null;
    setStatus('idle');
  }, []);

  return { chunks, status, error, start, abort };
}