import React from 'react';

export interface EmptySubDomainProps {
  domain: string;
  section?: string;
  onBack?: () => void;
}

function formatSectionLabel(section: string | undefined): string {
  if (!section || section === '/') return 'this section';
  const trimmed = section.replace(/^\//, '');
  return trimmed || 'this section';
}

export function EmptySubDomain({ domain, section, onBack }: EmptySubDomainProps): React.ReactElement {
  const sectionLabel = formatSectionLabel(section);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        gap: 8,
        minHeight: 280,
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 'var(--step-2)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        No highlights in {sectionLabel}
      </h3>
      <p
        style={{
          fontFamily: 'var(--sans)',
          fontSize: 'var(--step-0)',
          color: 'var(--ink-3)',
          lineHeight: 1.45,
          maxWidth: '32ch',
          margin: 0,
        }}
      >
        This section of {domain} is empty.
      </p>
      {onBack && (
        <button type="button" className="btn sm" style={{ marginTop: 14 }} onClick={onBack}>
          Back to {domain}
        </button>
      )}
    </div>
  );
}
