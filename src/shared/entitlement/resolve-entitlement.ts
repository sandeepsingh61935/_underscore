/**
 * Single commercial entitlement view for UI, IPC, and Cloud MCP (ADR-029 §5).
 * Mode strings are not a second commercial meaning — callers pass isPaidActive.
 */

export type EntitlementFlags = {
  ai: boolean;
  mcp: boolean;
};

export type EntitlementView = {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  flags: EntitlementFlags;
};

export function resolveEntitlement(input: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
}): EntitlementView {
  const isAuthenticated = input.isAuthenticated;
  const isPaidActive = isAuthenticated && input.isPaidActive;
  return {
    isAuthenticated,
    isPaidActive,
    flags: {
      ai: isPaidActive,
      mcp: isPaidActive,
    },
  };
}
