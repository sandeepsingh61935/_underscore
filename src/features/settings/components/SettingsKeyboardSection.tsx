/**
 * Read-only keyboard shortcuts table for Settings.
 */
import React, { useMemo } from 'react';

import {
  buildShortcutsTable,
  detectShortcutPlatform,
} from '@/shared/keyboard/shortcuts-table';

export function SettingsKeyboardSection(props?: {
  /** Hide outer “Keyboard” kicker when parent page already titles it. */
  hideHeading?: boolean;
}): React.ReactElement {
  const hideHeading = props?.hideHeading ?? false;
  const rows = useMemo(() => buildShortcutsTable(detectShortcutPlatform()), []);

  return (
    <div data-testid="settings-section-keyboard">
      {!hideHeading ? (
        <div
          className="u-caps"
          style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
        >
          Keyboard
        </div>
      ) : null}
      <div
        style={{
          margin: '0 16px 12px',
          border: '1px solid var(--rule-soft)',
        }}
      >
        <table
          data-testid="settings-shortcuts-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'var(--step--1)',
          }}
        >
          <thead>
            <tr
              className="u-mono"
              style={{
                textAlign: 'left',
                fontSize: 'var(--step--2)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                borderBottom: '1px solid var(--rule-soft)',
              }}
            >
              <th style={{ padding: '8px 10px', fontWeight: 500 }}>Action</th>
              <th style={{ padding: '8px 10px', fontWeight: 500 }}>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-testid={`shortcut-row-${row.id}`}
                style={{ borderBottom: '1px solid var(--rule-soft)' }}
              >
                <td
                  className="u-sans"
                  style={{
                    padding: '10px',
                    color: 'var(--ink)',
                    verticalAlign: 'top',
                    lineHeight: 1.4,
                  }}
                >
                  <div>{row.action}</div>
                  {row.note ? (
                    <div
                      className="u-mono"
                      style={{
                        marginTop: 4,
                        fontSize: 'var(--step--2)',
                        color: row.destructive ? 'var(--ink-3)' : 'var(--ink-4)',
                        letterSpacing: '0.04em',
                        textTransform: 'none',
                      }}
                    >
                      {row.destructive ? 'Destructive · ' : ''}
                      {row.note}
                    </div>
                  ) : null}
                </td>
                <td
                  className="u-mono"
                  style={{
                    padding: '10px',
                    color: 'var(--ink-2)',
                    whiteSpace: 'nowrap',
                    fontSize: 'var(--step--2)',
                    letterSpacing: '0.04em',
                    verticalAlign: 'top',
                  }}
                >
                  {row.shortcut}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
