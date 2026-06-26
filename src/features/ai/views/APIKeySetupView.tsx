import React, { useState } from 'react';

import { useAPIKeyStatus } from '../hooks/useAPIKeyStatus';
import { useLLMHealthCheck } from '../hooks/useLLMHealthCheck';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';

interface APIKeySetupViewProps {
  initialProvider?: ProviderName;
  onClose: () => void;
}

interface ProviderMeta {
  label: string;
  keyPlaceholder?: string;
  /** Optional endpoint field (only used by Ollama). */
  endpointPlaceholder?: string;
  endpointHelp?: string;
}

const PROVIDER_META: Record<ProviderName, ProviderMeta> = {
  anthropic: { label: 'Anthropic (Claude)', keyPlaceholder: 'sk-ant-...' },
  openai: { label: 'OpenAI (GPT)', keyPlaceholder: 'sk-...' },
  gemini: { label: 'Google Gemini', keyPlaceholder: 'AIza...' },
  openrouter: { label: 'OpenRouter', keyPlaceholder: 'sk-or-...' },
  minimax: { label: 'MiniMax', keyPlaceholder: 'eyJ...' },
  ollama: {
    label: 'Ollama (local)',
    endpointPlaceholder: 'http://localhost:11434',
    endpointHelp: 'Ensure OLLAMA_ORIGINS=chrome-extension://* is set before connecting.',
  },
};

/** Providers that need an API key; ollama uses an endpoint instead. */
const KEY_PROVIDERS: ReadonlyArray<ProviderName> = ['anthropic', 'openai', 'gemini', 'openrouter', 'minimax'];

export function APIKeySetupView({ initialProvider = 'anthropic', onClose }: APIKeySetupViewProps): React.ReactElement {
  const [provider, setProvider] = useState<ProviderName>(initialProvider);
  const [key, setKey] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:11434');
  const [health, setHealth] = useState<string | null>(null);

  const status = useAPIKeyStatus(provider);
  const { run: runHealth } = useLLMHealthCheck();

  const meta = PROVIDER_META[provider];
  const requiresKey = KEY_PROVIDERS.includes(provider);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
        padding: 'var(--step-2)', gap: 'var(--step-1)',
      }}
    >
      <h2 className="u-serif" style={{ margin: 0 }}>AI provider setup</h2>

      <label className="u-kicker">Provider</label>
      <select
        value={provider}
        onChange={e => setProvider(e.target.value as ProviderName)}
      >
        {(Object.keys(PROVIDER_META) as ProviderName[]).map(p => (
          <option key={p} value={p}>{PROVIDER_META[p].label}</option>
        ))}
      </select>

      {requiresKey && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="u-kicker" style={{ margin: 0 }}>{meta.label} API key</label>
            {status.isSet && (
              <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)', background: 'var(--paper-2)', padding: '2px 6px', borderRadius: '4px' }}>✓ Configured</span>
            )}
          </div>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder={status.isSet ? 'Key is saved. Enter new key to replace...' : meta.keyPlaceholder}
          />
        </>
      )}

      {provider === 'ollama' && (
        <>
          <label className="u-kicker">Ollama endpoint</label>
          <input
            type="text"
            value={apiBase}
            onChange={e => setApiBase(e.target.value)}
            placeholder={meta.endpointPlaceholder}
          />
          <p className="u-caps" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
            {meta.endpointHelp}
          </p>
        </>
      )}

      <div style={{ display: 'flex', gap: 'var(--step-1)' }}>
        <button type="button" onClick={async () => {
          if (requiresKey && key) await status.save(key);
          const result = await runHealth(provider, provider === 'ollama' ? apiBase : undefined);
          if (result.success) setHealth(`OK: ${result.data.model}`);
          else setHealth(`Failed: ${result.error}`);
        }}>Save & test</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>

      {health && <p style={{ color: 'var(--ink)' }}>{health}</p>}
    </div>
  );
}