import { afterEach, describe, expect, it } from 'vitest';

import { stashOauthReturnTo, takeOauthReturnTo } from './oauth-return-to';

describe('oauth returnTo stash', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('round-trips and clears', () => {
    stashOauthReturnTo('/library');
    expect(takeOauthReturnTo()).toBe('/library');
    expect(takeOauthReturnTo()).toBeNull();
  });
});
