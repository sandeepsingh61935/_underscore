import React from 'react';

import type { InstallBrowserDetect } from '@/web/install/install-distribution';
import type { WebClientKind } from '@/web/lib/classify-web-client';
import { WelcomePage } from './WelcomePage';

export interface InstallPageProps {
  detectedBrowser?: InstallBrowserDetect;
  clientKind?: WebClientKind;
}

/**
 * Install alias — renders the same welcome-gate markup with gate open.
 * Keeps legacy selectors via data-od-id="install" data-alias="welcome-gate".
 * Only renders the gate on desktop Firefox; redirects to /home otherwise.
 * @deprecated Use WelcomePage with initialGateOpen; kept for legacy routes/tests.
 */
export function InstallPage(props: InstallPageProps = {}): React.ReactElement {
  return <WelcomePage initialGateOpen aliasMode {...props} />;
}

export default InstallPage;
