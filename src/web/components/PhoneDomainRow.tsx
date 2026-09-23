import React from 'react';

export function PhoneDomainRow({
  domain,
  count,
  onClick,
}: {
  domain: string;
  count: number;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      className="phone-domain-row"
      data-od-id={`phone-domain-${domain.replace(/\./g, '-')}`}
      onClick={onClick}
    >
      <span className="phone-domain-name">{domain}</span>
      <span className="phone-domain-count">{count} highlight{count === 1 ? '' : 's'}</span>
    </button>
  );
}
