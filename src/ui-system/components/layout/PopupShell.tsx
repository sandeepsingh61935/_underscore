import React, { type ReactNode } from 'react';

import { modeRegistry } from '../../../features/modes/registry';

export interface PopupShellProps {
  children: ReactNode;
  dark?: boolean;
  mode?: string;
  title?: string;
  chromeStyle?: 'none' | 'simple';
}

function PopupChrome({ title, mode }: { dark?: boolean; title: string; mode?: string }): React.ReactElement {
  const m = mode ? modeRegistry.get(mode) : null;
  return (
    <div style={{
      width: 400,
      background: "var(--paper-2)",
      borderLeft: "1px solid var(--rule)",
      borderRight: "1px solid var(--rule)",
      borderTop: "1px solid var(--rule)",
      padding: "8px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontFamily: "var(--mono)",
      fontSize: 10,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--ink-3)",
    }}>
      <span>{title}</span>
      {m && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: m.accent, display: "inline-block" }} />
          {m.name}
        </span>
      )}
    </div>
  );
}

export function PopupShell({
  dark = false,
  children,
  mode,
  title = "_underscore",
  chromeStyle = "simple"
}: PopupShellProps): React.ReactElement {
  return (
    <div className={`ue ${dark ? "dark" : ""}`} style={{ width: 400, height: 600, background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      {chromeStyle !== "none" && <PopupChrome dark={dark} title={title} mode={mode} />}
      <div className="popup" style={{ borderTop: chromeStyle !== "none" ? "none" : "1px solid var(--rule)", flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
