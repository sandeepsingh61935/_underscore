const KEY = 'underscore:oauth_return_to';

export function stashOauthReturnTo(path: string): void {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // private mode
  }
}

export function takeOauthReturnTo(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) sessionStorage.removeItem(KEY);
    return raw;
  } catch {
    return null;
  }
}
