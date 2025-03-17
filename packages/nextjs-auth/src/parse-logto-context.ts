import type { LogtoContext, UserInfoResponse } from "@logto/next";
import { isInactivePublicServant } from "./inactive-public-servant.js";
import type {
  AuthSessionContext,
  AuthSessionOrganizationInfo,
  AuthSessionUserInfo,
  GetContextParams,
} from "./types.js";

/**
 * @param context The context got from Logto
 * @param organizationRoles The organization roles extracted from the context
 * @param requestedOrganizationId The organization id to return data for
 * @returns The details of the requeste organization, if available
 */
export function parseOrganizationInfo(
  context: LogtoContext,
  organizationRoles: string[] | null,
): Record<string, AuthSessionOrganizationInfo> | undefined {
  if (organizationRoles === null || organizationRoles.length === 0) {
    return undefined;
  }

  if (!context.userInfo?.organization_data) {
    return undefined;
  }

  const rolesByOrg: Record<string, string[]> = {};
  // The organization role names are in format
  // orgId:roleName
  for (const role of organizationRoles) {
    const [orgId, roleName] = role.split(":");
    if (!rolesByOrg[orgId]) {
      rolesByOrg[orgId] = [];
    }
    rolesByOrg[orgId].push(roleName);
  }

  const output: Record<string, AuthSessionOrganizationInfo> = {};
  for (const currentOrg of context.userInfo.organization_data) {
    output[currentOrg.id] = {
      id: currentOrg.id,
      name: currentOrg.name,
      roles: rolesByOrg[currentOrg.id] ?? [],
      description: currentOrg.description,
    };
  }

  return output;
}

/**
 * @param context The context got from Logto
 * @returns The list of roles for the current org, if any
 */
export function parseOrganizationRoles(context: LogtoContext): string[] | null {
  const organizationRoles: string[] = [];

  if (context.claims && Array.isArray(context.claims.organization_roles)) {
    organizationRoles.push(...context.claims.organization_roles);
  }

  if (context.userInfo && Array.isArray(context.userInfo.organization_roles)) {
    organizationRoles.push(...context.userInfo.organization_roles);
  }

  if (organizationRoles.length === 0) {
    return null;
  }

  const uniqueValues = new Set<string>(organizationRoles);

  return Array.from(uniqueValues);
}

function isPublicServant(
  orgRoles: string[] | null,
  getContextParameters: GetContextParams,
): boolean {
  if (isInactivePublicServant(orgRoles) || orgRoles === null) {
    return false;
  }

  return orgRoles.some((orgRole) => {
    const [_, role] = orgRole.split(":");
    return (
      getContextParameters.additionalContextParams
        ?.publicServantExpectedRoles ?? []
    ).includes(role);
  });
}

/**
 *
 * @param context The context got from Logto, with required userInfo
 * @param getContextParameters The parameters used to retrieve context from Logto
 * @returns The parsed user info from Logto
 */
export function parseUserInfo(
  context: LogtoContext & { userInfo: UserInfoResponse },
  currentOrganizationId: string | undefined,
): AuthSessionUserInfo | undefined {
  let name: string | null = null;
  let username: string | null = null;
  let id: string | null = null;
  let email: string | null = null;

  name = name ?? context.userInfo.name ?? null;
  username = username ?? context.userInfo.username ?? null;
  id = context.userInfo.sub;
  email = email ?? context.userInfo.email ?? null;

  if (context.claims) {
    name = context.claims.name ?? null;
    username = context.claims.username ?? null;
    id = context.claims.sub;
    email = context.claims.email ?? null;
  }

  if (id === null || (name === null && username === null && email === null)) {
    return undefined;
  }
  const organizationRoles = parseOrganizationRoles(context);
  const organizationData = parseOrganizationInfo(context, organizationRoles);
  const currentOrganization =
    currentOrganizationId &&
    organizationData &&
    currentOrganizationId in organizationData
      ? organizationData[currentOrganizationId]
      : undefined;

  return {
    id,
    organizationData,
    currentOrganization,
  };
}

/**
 *
 * @param context The context got from Logto
 * @param getContextParameters The parameters used to retrieve context from Logto
 * @returns The parsed context
 */
export function parseContext(
  context: LogtoContext,
  getContextParameters: GetContextParams,
): AuthSessionContext {
  const orgRoles = parseOrganizationRoles(context);
  // const orgInfo = getContextParameters.additionalContextParams?.organizationId
  //   ? parseOrganizationInfo(
  //       context,
  //       orgRoles,
  //       getContextParameters.additionalContextParams.organizationId,
  //     )
  //   : undefined;
  const isPs = isPublicServant(orgRoles, getContextParameters);
  const isInactivePs = isInactivePublicServant(orgRoles);

  const outputContext: AuthSessionContext = {
    isPublicServant: isPs,
    isInactivePublicServant: isInactivePs,
  };

  if (getContextParameters.additionalContextParams?.includeOriginalContext) {
    outputContext.originalContext = context;
  }

  return outputContext;
}
