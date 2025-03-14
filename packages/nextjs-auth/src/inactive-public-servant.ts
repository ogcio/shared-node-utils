import type { LogtoNextConfig } from "@logto/next";
import {
  INACTIVE_PUBLIC_SERVANT_ORG_ROLE,
  INACTIVE_PUBLIC_SERVANT_SCOPE,
} from "./utils/constants.js";
import { deepClone } from "./utils/deep-clone.js";

export function addInactivePublicServantScope(
  config: LogtoNextConfig,
): LogtoNextConfig {
  const outputConfig = deepClone(config);
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
