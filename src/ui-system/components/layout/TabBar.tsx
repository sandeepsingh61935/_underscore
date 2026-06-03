import React from 'react';

export interface TabBarProps {
  active?: 'home' | 'collections' | 'capture' | 'settings';
  onChange?: (tab: 'home' | 'collections' | 'capture' | 'settings') => void;
}

export function TabBar({ active = "home", onChange = () => {} }: TabBarProps): React.ReactElement {
  const tabs = [
    { id: "home", label: "Home" },
    { id: "collections", label: "Library" },
    { id: "capture", label: "Capture" },
    { id: "settings", label: "Settings" },
  ] as const;

  return (
    <div className="tabbar" style={{ display: 'flex', borderTop: '1px solid var(--rule)', background: 'var(--paper)', height: 44 }}>
      {tabs.map((t) => (
        <button 
          key={t.id} 
          className={`u-sans ${active === t.id ? "active" : ""}`} 
          onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            all: 'unset',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: active === t.id ? 'var(--ink)' : 'var(--ink-3)',
            fontWeight: active === t.id ? 500 : 400,
            transition: 'color 0.2s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
