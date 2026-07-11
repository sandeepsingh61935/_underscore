import React, { useEffect, useState } from 'react';

import { ModelsHubPanel } from '../components/ModelsHubPanel';
import { ProviderDetailPanel } from '../components/ProviderDetailPanel';
import { useActiveLLMProvider } from '../hooks/useActiveLLMProvider';
import { useAllProviderStatuses } from '../hooks/useAllProviderStatuses';
import { SETUP_PROVIDERS } from '../constants/provider-setup';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';

interface APIKeySetupViewProps {
  initialProvider?: ProviderName;
  onClose: () => void;
}

type SetupScreen = 'hub' | 'provider';

export function APIKeySetupView({ initialProvider, onClose: _onClose }: APIKeySetupViewProps): React.ReactElement {
  const active = useActiveLLMProvider();
  const { statuses, refresh: refreshStatuses } = useAllProviderStatuses(SETUP_PROVIDERS);

  const [screen, setScreen] = useState<SetupScreen>('hub');
  const [provider, setProvider] = useState<ProviderName | null>(null);

  useEffect(() => {
    if (initialProvider && SETUP_PROVIDERS.includes(initialProvider)) {
      setProvider(initialProvider);
      setScreen('provider');
    }
  }, [initialProvider]);

  const activeModelId = active.provider ? statuses[active.provider]?.model ?? null : null;

  const openProvider = (next: ProviderName): void => {
    setProvider(next);
    setScreen('provider');
  };

  const handleBackToHub = (): void => {
    setScreen('hub');
    void refreshStatuses();
    void active.refresh();
  };

  const handleSaved = (): void => {
    void refreshStatuses();
    void active.refresh();
    setScreen('hub');
    setProvider(null);
  };

  const handleChangeActiveModel = (): void => {
    const target = active.provider && SETUP_PROVIDERS.includes(active.provider)
      ? active.provider
      : SETUP_PROVIDERS.find(p => statuses[p]?.configured) ?? 'anthropic';
    openProvider(target);
  };

  if (screen === 'provider' && provider) {
    return (
      <ProviderDetailPanel
        provider={provider}
        onBack={handleBackToHub}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <ModelsHubPanel
      activeProvider={active.provider}
      activeModelId={activeModelId}
      statuses={statuses}
      onOpenProvider={openProvider}
      onChangeActiveModel={handleChangeActiveModel}
    />
  );
}
