import { useState } from 'react';

import { useAPIKeyStatus } from '../hooks/useAPIKeyStatus';
import { useLLMHealthCheck } from '../hooks/useLLMHealthCheck';

interface APIKeySetupViewProps {
  initialProvider?: 'anthropic' | 'ollama';
  onClose: () => void;
}

export function APIKeySetupView({ initialProvider = 'anthropic', onClose }: APIKeySetupViewProps) {
  const [provider, setProvider] = useState<'anthropic' | 'ollama'>(initialProvider);
  const [key, setKey] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:11434');
  const [health, setHealth] = useState<string | null>(null);

  const status = useAPIKeyStatus(provider);
  const { run: runHealth } = useLLMHealthCheck();

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
        padding: 'var(--step-2)', gap: 'var(--step-1)',
      }}
    >
      <h2 className="u-serif" style={{ margin: 0 }}>AI provider setup</h2>

      <label className="u-kicker">Provider</label>
      <select value={provider} onChange={e => setProvider(e.target.value as 'anthropic' | 'ollama')}>
        <option value="anthropic">Anthropic (Claude)</option>
        <option value="ollama">Ollama (local)</option>
      </select>

      {provider === 'anthropic' && (
        <>
          <label className="u-kicker">Anthropic API key</label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-..."
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
            placeholder="http://localhost:11434"
          />
          <p className="u-caps" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
            Ensure OLLAMA_ORIGINS=chrome-extension://* is set before connecting.
          </p>
        </>
      )}

      <div style={{ display: 'flex', gap: 'var(--step-1)' }}>
        <button type="button" onClick={async () => {
          if (provider === 'anthropic' && key) await status.save(key);
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