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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 20, textAlign: "center" }}>
      <div style={{ width: 50, height: 50, border: "1px dashed var(--rule)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <span className="u-serif" style={{ fontSize: 28, color: "var(--ink-3)", fontStyle: "italic" }}>"</span>
      </div>
      <div className="u-serif" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>No highlights in {sectionLabel}</div>
      <div className="u-serif" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic", maxWidth: 260 }}>
        This section of {domain} is empty. Head back to explore others.
      </div>
      <button type="button" className="btn ghost sm" style={{ marginTop: 14 }} onClick={onBack}>
        ← Back to {domain}
      </button>
    </div>
  );
}
