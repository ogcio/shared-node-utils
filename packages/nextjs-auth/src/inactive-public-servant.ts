import type { LogtoNextConfig } from "@logto/next";

export const INACTIVE_PUBLIC_SERVANT_SCOPE = "bb:public-servant.inactive:*";
export const INACTIVE_PUBLIC_SERVANT_ORG_ROLE =
  "inactive-ps-org:Inactive Public Servant";

export function addInactivePublicServantScope(
  config: LogtoNextConfig,
): LogtoNextConfig {
  const outputConfig = { ...config };
  if (
    outputConfig.scopes &&
    !outputConfig.scopes.includes(INACTIVE_PUBLIC_SERVANT_SCOPE)
  ) {
    outputConfig.scopes.push(INACTIVE_PUBLIC_SERVANT_SCOPE);
  }

  return outputConfig;
}

export function isInactivePublicServant(orgRoles: string[] | null): boolean {
  return orgRoles?.includes(INACTIVE_PUBLIC_SERVANT_ORG_ROLE) ?? false;
}
