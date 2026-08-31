import React, { useEffect, useState } from 'react';

import { ModelsHubPanel } from '../components/ModelsHubPanel';
import { ProviderDetailPanel } from '../components/ProviderDetailPanel';
import { SETUP_PROVIDERS } from '../constants/provider-setup';
import { useActiveLLMProvider } from '../hooks/useActiveLLMProvider';
import { useAllProviderStatuses } from '../hooks/useAllProviderStatuses';

import { useIpcAction } from '@/shared/hooks/useIpcAction';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { IPC_AI_SYNC_PREFS } from '@/shared/schemas/message-schemas';

interface APIKeySetupViewProps {
  initialProvider?: ProviderName;
  onClose: () => void;
}

type SetupScreen = 'hub' | 'provider';

export function APIKeySetupView({
  initialProvider,
  onClose: _onClose,
}: APIKeySetupViewProps): React.ReactElement {
  const active = useActiveLLMProvider();
  const { statuses, refresh: refreshStatuses } = useAllProviderStatuses(SETUP_PROVIDERS);
  const syncPrefs = useIpcAction<
    Record<string, never>,
    { source: string; wroteRemote: boolean; synced: boolean }
  >(IPC_AI_SYNC_PREFS);

  const [screen, setScreen] = useState<SetupScreen>('hub');
  const [provider, setProvider] = useState<ProviderName | null>(null);

  useEffect(() => {
    if (initialProvider && SETUP_PROVIDERS.includes(initialProvider)) {
      setProvider(initialProvider);
      setScreen('provider');
    }
  }, [initialProvider]);

  // Account prefs LWW pull when opening Models hub (Phase 3).
  useEffect(() => {
    void (async () => {
      const result = await syncPrefs({});
      if (result.success) {
        void refreshStatuses();
        void active.refresh();
      }
    })();
    // Mount-only pull; refresh helpers are stable enough for hub open.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once on open
  }, []);

  const activeModelId = active.provider
    ? (statuses[active.provider]?.model ?? null)
    : null;

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
    const target =
      active.provider && SETUP_PROVIDERS.includes(active.provider)
        ? active.provider
        : (SETUP_PROVIDERS.find((p) => statuses[p]?.configured) ?? 'anthropic');
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
