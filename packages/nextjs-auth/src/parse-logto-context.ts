import type { LogtoContext } from "@logto/next";
import { isInactivePublicServant } from "./inactive-public-servant.js";
import type {
  AuthSessionContext,
  AuthSessionOrganizationInfo,
  AuthSessionUserInfo,
  GetContextParams,
  OrganizationData,
} from "./types.js";

export function parseOrganizationInfo(
  context: LogtoContext,
  organizationRoles: string[] | null,
  requestedOrganizationId?: string,
): AuthSessionOrganizationInfo | undefined {
  if (organizationRoles === null || organizationRoles.length === 0) {
    return undefined;
  }

  if (!requestedOrganizationId || !context.userInfo?.organization_data) {
    return undefined;
  }

  if (!context.userInfo?.organizations?.includes(requestedOrganizationId)) {
    return undefined;
  }

  for (const currentOrg of context.userInfo.organization_data) {
    if (currentOrg.id === requestedOrganizationId) {
      return {
        id: currentOrg.id,
        name: currentOrg.name,
        roles: organizationRoles,
      };
    }
  }

  return undefined;
}

export const parseOrganizationRoles = (
  context: LogtoContext,
): string[] | null => {
  let organizationRoles: Set<string> | null = null;

  if (context.claims && Array.isArray(context.claims.organization_roles)) {
    organizationRoles = new Set<string>(context.claims.organization_roles);
  }

  if (context.userInfo && Array.isArray(context.userInfo.organization_roles)) {
    if (organizationRoles === null) {
      organizationRoles = new Set<string>();
    }

    organizationRoles = new Set<string>([
      ...Array.from(organizationRoles),
      ...context.userInfo.organization_roles,
    ]);
  }

  return organizationRoles ? Array.from(organizationRoles) : null;
};

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

export function parseUserInfo(
  context: LogtoContext,
  getContextParameters: GetContextParams,
): AuthSessionUserInfo | undefined {
  let name: string | null = null;
  let username: string | null = null;
  let id: string | null = null;
  let email: string | null = null;

  if (context.claims) {
    name = context.claims.name ?? null;
    username = context.claims.username ?? null;
    id = context.claims.sub;
    email = context.claims.email ?? null;
  }

  if (context.userInfo) {
    name = name ?? context.userInfo.name ?? null;
    username = username ?? context.userInfo.username ?? null;
    id = context.userInfo.sub;
    email = email ?? context.userInfo.email ?? null;
  }

  if (id === null || (name === null && username === null && email === null)) {
    return undefined;
  }

  const organizations = (context.userInfo?.organization_data ?? []).filter(
    (org) => {
      return (
        getContextParameters.additionalContextParams
          ?.publicServantExpectedRoles ?? []
      ).some((role) => {
        const orgPSRole = `${org.id}:${role}`;
        return context.userInfo?.organization_roles?.includes(orgPSRole);
      });
    },
  );

  const organizationData = organizations.reduce(
    (acc: Record<string, OrganizationData>, current) => {
      acc[current.id] = current;
      return acc;
    },
    {},
  );

  return {
    id,
    organizationData,
  };
}

export function parseContext(
  context: LogtoContext,
  getContextParameters: GetContextParams,
): AuthSessionContext {
  const orgRoles = parseOrganizationRoles(context);
  const orgInfo = parseOrganizationInfo(
    context,
    orgRoles,
    getContextParameters.additionalContextParams?.organizationId,
  );
  const isPs = isPublicServant(orgRoles, getContextParameters);
  const isInactivePs = isInactivePublicServant(orgRoles);

  const outputContext: AuthSessionContext = {
    isPublicServant: isPs,
    isInactivePublicServant: isInactivePs,
  };

  if (orgInfo) {
    outputContext.organization = orgInfo;
  }
  if (getContextParameters.additionalContextParams?.includeOriginalContext) {
    outputContext.originalContext = context;
  }

  return outputContext;
}
