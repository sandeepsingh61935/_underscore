export type ConnectNextAction =
  | { kind: 'locked' }
  | { kind: 'connect' }
  | { kind: 'copied' };

/** Amateur hub CTA. Copying the URL is the only Connect side effect. Status does not change the label. */
export function resolveConnectAction(input: {
  mcpAllowed: boolean;
  urlCopied: boolean;
}): ConnectNextAction {
  if (!input.mcpAllowed) {
    return { kind: 'locked' };
  }
  return input.urlCopied ? { kind: 'copied' } : { kind: 'connect' };
}
