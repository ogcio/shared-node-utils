import type { LogtoNextConfig } from "@logto/next";
import {
  INACTIVE_PUBLIC_SERVANT_ORG_ROLE,
  INACTIVE_PUBLIC_SERVANT_SCOPE,
} from "./utils/constants.js";
import { deepClone } from "./utils/deep-clone.js";

/**
 * When a public servant is initially onboarded
 * the inactive role is assigned, with this method
 * we aim to request also scopes for that role
 *
 * @param config The current Logto config used to communicate with Logto
 * @returns
 */
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
