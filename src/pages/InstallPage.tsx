import React from 'react';

import { WelcomePage } from './WelcomePage';

/**
 * Install alias — renders the same welcome-gate markup with gate open.
 * Keeps legacy selectors via data-od-id="install" data-alias="welcome-gate".
 * @deprecated Use WelcomePage with initialGateOpen; kept for legacy routes/tests.
 */
export function InstallPage(): React.ReactElement {
  return <WelcomePage initialGateOpen aliasMode />;
}

export default InstallPage;
