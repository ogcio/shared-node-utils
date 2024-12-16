import type { Level, Logger } from "pino";
import { AuthSession, AuthUserScope } from "./auth-session.js";
import type { PartialAuthSessionContext } from "./types.js";

export interface LogtoParams {
  logLevel: Level | undefined;
  isProductionEnv: boolean;
  logtoEndpoint: string;
  logtoCookieSecret: string;
}

export const getBaseLogtoConfig = (logtoParams: LogtoParams) => ({
  cookieSecure: logtoParams.isProductionEnv,
  endpoint: logtoParams.logtoEndpoint,
  cookieSecret: logtoParams.logtoCookieSecret,
});

export const organizationScopes = [
  AuthUserScope.Organizations,
  AuthUserScope.OrganizationRoles,
];

interface PublicServantParameters {
  resourceUrl?: string;
  publicServantScopes: string[];
  organizationId?: string;
  loginUrl: string;
  publicServantExpectedRoles: string[];
  baseUrl: string;
  appId: string;
  appSecret: string;
}

interface CitizenParameters {
  resourceUrl?: string;
  citizenScopes: string[];
  loginUrl: string;
  publicServantExpectedRoles: string[];
  baseUrl: string;
  appId: string;
  appSecret: string;
}

export const getCitizenContext = async (
  params: CitizenParameters & { logtoParams: LogtoParams },
  logger: Logger,
): Promise<PartialAuthSessionContext> => {
  const citizenAuthConfig = buildCitizenAuthConfig(params);
  const contextParameters = buildCitizenContextParameters(params);
  logger.trace(
    {
      citizenAuthConfig: {
        endpoint: citizenAuthConfig.endpoint,
        resources: citizenAuthConfig.resources,
        cookieSecure: citizenAuthConfig.cookieSecure,
        scopes: citizenAuthConfig.scopes,
        baseUrl: citizenAuthConfig.baseUrl,
        appId: citizenAuthConfig.appId,
        isCookieSecretSet: citizenAuthConfig.cookieSecret?.length > 0,
      },
      contextParameters,
    },
    "Requesting citizen context",
  );
  try {
    const citizenContext = await AuthSession.get(
      citizenAuthConfig,
      contextParameters,
    );

    logger.trace(
      {
        isInactivePublicServant: citizenContext.isInactivePublicServant,
        isPublicServant: citizenContext.isPublicServant,
        userId: citizenContext.user?.id,
      },
      "Got citizen context",
    );

    return citizenContext;
  } catch (e) {
    logger.error({ error: e }, "Error getting citizen context");
    throw e;
  }
};

export const getPublicServantContext = async (
  params: PublicServantParameters & { logtoParams: LogtoParams },
  logger: Logger,
): Promise<PartialAuthSessionContext> => {
  const authConfig = buildPublicServantAuthConfig(params);
  const contextParameters = buildPublicServantContextParameters(params);
  logger.trace(
    {
      publicServantAuthConfig: {
        endpoint: authConfig.endpoint,
        resources: authConfig.resources,
        cookieSecure: authConfig.cookieSecure,
        scopes: authConfig.scopes,
        baseUrl: authConfig.baseUrl,
        appId: authConfig.appId,
        isCookieSecretSet: authConfig.cookieSecret?.length > 0,
      },
      contextParameters,
    },
    "Requesting public servant context",
  );
  try {
    const publicServantContext = await AuthSession.get(
      authConfig,
      contextParameters,
    );

    logger.trace(
      {
        isInactivePublicServant: publicServantContext.isInactivePublicServant,
        isPublicServant: publicServantContext.isPublicServant,
        userId: publicServantContext.user?.id,
      },
      "Got public servant context",
    );

    return publicServantContext;
  } catch (e) {
    logger.error({ error: e }, "Error getting public servant context");
    throw e;
  }
};

export const isPublicServantAuthenticated = async (
  params: PublicServantParameters & { logtoParams: LogtoParams },
  logger: Logger,
): Promise<boolean> => {
  const isUserAuthenticatedAsPublicServant = await AuthSession.isAuthenticated(
    buildPublicServantAuthConfig(params),
    buildPublicServantContextParameters(params),
  );

  if (!isUserAuthenticatedAsPublicServant) {
    logger.trace({}, "User is not authenticated as public servant");
    return false;
  }

  const publicServantContext = await getPublicServantContext(params, logger);
  const isPublicServant = publicServantContext.isPublicServant;
  logger.trace({ isPublicServant }, "Checking if user is public servant");

  return isPublicServant;
};

export const isAuthenticated = async (params: {
  appId: string;
  baseUrl: string;
  logtoParams: LogtoParams;
}): Promise<boolean> => {
  return AuthSession.isAuthenticated({
    ...getBaseLogtoConfig(params.logtoParams),
    ...params,
  });
};

export const isCitizenAuthenticated = async (
  params: CitizenParameters & { logtoParams: LogtoParams },
  logger: Logger,
): Promise<boolean> => {
  const isUserAuthenticatedAsCitizen = await AuthSession.isAuthenticated(
    buildCitizenAuthConfig(params),
    buildCitizenContextParameters(params),
  );
  if (!isUserAuthenticatedAsCitizen) {
    logger.trace({}, "User is not authenticated as citizen");
    return false;
  }

  const citizen = await getCitizenContext(params, logger);
  const isCitizen = !citizen.isPublicServant;
  logger.trace({ isCitizen }, "Checking if user is citizen");

  return isCitizen;
};

export const getSelectedOrganization = () =>
  AuthSession.getSelectedOrganization();

export const setSelectedOrganization = (organizationId: string) =>
  AuthSession.setSelectedOrganization(organizationId);

export const getCitizenToken = async (
  params: CitizenParameters & { logtoParams: LogtoParams },
  logger: Logger,
  resource?: string,
): Promise<string> => {
  const authConfig = buildCitizenAuthConfig(params);
  logger.trace(
    {
      citizenAuthConfig: {
        endpoint: authConfig.endpoint,
        resources: authConfig.resources,
        cookieSecure: authConfig.cookieSecure,
        scopes: authConfig.scopes,
        baseUrl: authConfig.baseUrl,
        appId: authConfig.appId,
        isCookieSecretSet: authConfig.cookieSecret?.length > 0,
      },
      resource,
    },
    "Requesting citizen token",
  );
  try {
    const token = await AuthSession.getCitizenToken(authConfig, resource);
    logger.trace({}, "Citizen token retrieved");

    return token;
  } catch (e) {
    logger.error({ error: e }, "Error getting citizen token");
    throw e;
  }
};

export const getOrgToken = async (
  params: PublicServantParameters & { logtoParams: LogtoParams },
  organizationId: string,
  logger: Logger,
): Promise<string> => {
  const authConfig = buildPublicServantAuthConfig(params);
  logger.trace(
    {
      citizenAuthConfig: {
        endpoint: authConfig.endpoint,
        resources: authConfig.resources,
        cookieSecure: authConfig.cookieSecure,
        scopes: authConfig.scopes,
        baseUrl: authConfig.baseUrl,
        appId: authConfig.appId,
        isCookieSecretSet: authConfig.cookieSecret?.length > 0,
      },
      organizationId,
    },
    "Requesting public servant token",
  );
  try {
    const token = await AuthSession.getOrgToken(
      buildPublicServantAuthConfig(params),
      organizationId,
    );
    logger.trace({}, "Public servant token retrieved!");
    return token;
  } catch (e) {
    logger.error({ error: e }, "Error getting public servant token");

    throw e;
  }
};

const buildPublicServantAuthConfig = (
  params: PublicServantParameters & { logtoParams: LogtoParams },
) => ({
  ...getBaseLogtoConfig(params.logtoParams),
  baseUrl: params.baseUrl,
  appId: params.appId,
  appSecret: params.appSecret,
  scopes: [...organizationScopes, ...params.publicServantScopes],
  resources: params.resourceUrl ? [params.resourceUrl] : [],
});

const buildPublicServantContextParameters = (
  params: PublicServantParameters,
) => ({
  getOrganizationToken: false,
  fetchUserInfo: true,
  publicServantExpectedRoles: params.publicServantExpectedRoles ?? [],
  organizationId: params.organizationId,
  userType: "publicServant" as const,
  loginUrl: params.loginUrl,
});

const buildCitizenAuthConfig = (
  params: CitizenParameters & { logtoParams: LogtoParams },
) => ({
  ...getBaseLogtoConfig(params.logtoParams),
  baseUrl: params.baseUrl,
  appId: params.appId,
  appSecret: params.appSecret,
  resources: params.resourceUrl ? [params.resourceUrl] : [],
  scopes: [...params.citizenScopes],
});

const buildCitizenContextParameters = (params: CitizenParameters) => ({
  getAccessToken: false,
  resource: params.resourceUrl,
  fetchUserInfo: true,
  publicServantExpectedRoles: params.publicServantExpectedRoles ?? [],
  userType: "citizen" as const,
  loginUrl: params.loginUrl,
});
