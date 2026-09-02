/**
 * Site icon for a library domain. Prefers a locally compressed blob;
 * otherwise a public favicon URL; letter if both fail.
 */

import React, { useEffect, useState } from 'react';

import { getDomainFavicon } from '@/shared/favicon/domain-favicon-store';
import { domainInitial, faviconUrlForDomain } from '@/shared/utils/favicon-url';

export type DomainFaviconProps = {
  domain: string;
  className?: string;
};

export function DomainFavicon({
  domain,
  className = 'folder-ico',
}: DomainFaviconProps): React.ReactElement {
  const remote = faviconUrlForDomain(domain);
  const [src, setSrc] = useState<string | null>(remote);
  const [failed, setFailed] = useState(remote === null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(faviconUrlForDomain(domain));
    setFailed(faviconUrlForDomain(domain) === null);

    void getDomainFavicon(domain).then((row) => {
      if (cancelled || !row) return;
      const blob = new Blob([row.bytes], { type: row.mime });
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
      setFailed(false);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [domain]);

  if (failed || !src) {
    return (
      <span className={className} aria-hidden="true">
        {domainInitial(domain)}
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      <img
        src={src}
        alt=""
        width={16}
        height={16}
        decoding="async"
        onError={() => {
          setFailed(true);
        }}
      />
    </span>
  );
}
