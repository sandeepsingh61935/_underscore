import React from 'react';

import { DomainFavicon } from '@/web/components/DomainFavicon';

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
      <DomainFavicon domain={domain} className="phone-domain-ico" size={18} />
      <span className="phone-domain-copy">
        <span className="phone-domain-name">{domain}</span>
        <span className="phone-domain-count">
          {count} highlight{count === 1 ? '' : 's'}
        </span>
      </span>
      <span className="phone-domain-trail" aria-hidden="true">
        ›
      </span>
    </button>
  );
}
