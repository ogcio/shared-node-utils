import type { LogtoContext, LogtoNextConfig } from "@logto/next";
import {
  getAccessToken,
  getAccessTokenRSC,
  getLogtoContext,
  getOrganizationToken,
} from "@logto/next/server-actions";
import { redirect } from "next/navigation.js";
import type { Logger } from "pino";
import { hasPermissions } from "./check-permissions.js";
import { addInactivePublicServantScope } from "./inactive-public-servant.js";
import { parseContext, parseUserInfo } from "./parse-logto-context.js";
import { SelectedOrganizationHandler } from "./selected-organization-handler.js";
import type {
  AuthSessionContext,
  AuthSessionUserInfo,
  GetContextParams,
  UserContext,
} from "./types.js";
import {
  DEFAULT_LOGIN_PATH,
  ROLE_NAME_ONBOARDED_CITIZEN,
} from "./utils/constants.js";
import { tokenMutex } from "./tokenService.js";
import { createRemoteJWKSet, JWTPayload, jwtVerify } from "jose";

export class UserContextHandler implements UserContext {
  readonly config: LogtoNextConfig;
  private organizationId?: string;
  private loginUrl: string;
  constructor(
    config: LogtoNextConfig,
    private readonly getContextParameters: GetContextParams,
    private readonly logger: Logger,
  ) {
    this.config = addInactivePublicServantScope(config);
    this.organizationId =
      getContextParameters.additionalContextParams?.organizationId;
    this.loginUrl =
      this.getContextParameters?.additionalContextParams?.loginUrl ??
      DEFAULT_LOGIN_PATH;
  }
  private async getOriginalContext(
    fetchUserInfo?: boolean,
  ): Promise<LogtoContext> {
    let context: LogtoContext | undefined;
    try {
      context = await getLogtoContext(this.config, {
        ...this.getContextParameters?.logtoContextParams,
        fetchUserInfo,
      });
    } catch {
      redirect(this.loginUrl);
    }

    if (!context.isAuthenticated) {
      redirect(this.loginUrl);
    }

    return context;
  }
  async getContext(): Promise<AuthSessionContext>;
  async getContext(addOriginalContext?: boolean): Promise<AuthSessionContext>;
  /**
   * It loads the context from logto and parses it.
   * It performs a network request only at first run, then Logto SDK
   * stores the context itself.
   * @param addOriginalContext (optional) if true, it set the originalContext property
   * with the context loaded from Logto
   * @returns The parsed context
   */
  async getContext(addOriginalContext?: boolean): Promise<AuthSessionContext> {
    const includeOriginalContext = addOriginalContext ?? false;
    const context: LogtoContext = await this.getOriginalContext();

    let parsed: AuthSessionContext | undefined;
    try {
      parsed = parseContext(context, {
        ...this.getContextParameters,
        additionalContextParams: {
          ...this.getContextParameters.additionalContextParams,
          includeOriginalContext,
        },
      });
    } catch (err) {
      this.logger.warn({ error: err }, "Cannot parse logto context");
      redirect(this.loginUrl);
    }
    return parsed;
  }
  /**
   * Use this method carefully
   * cause it runs a network request against Logto
   * @returns The user info from Logto
   */
  async getUser(addOriginalContext?: true): Promise<AuthSessionUserInfo> {
    const context = await this.getOriginalContext(true);
    if (!context.userInfo) {
      throw new Error("Cannot get user info");
    }
    const parsed = parseUserInfo(
      { ...context, userInfo: context.userInfo },
      this.getOrganizationId(),
    );

    if (!parsed) {
      throw new Error("Cannot parse user info");
    }
    if (addOriginalContext) {
      parsed.originalContext = context;
    }

    return parsed;
  }
  async isAuthenticated(): Promise<boolean> {
    const context = await this.getOriginalContext();

    return context.isAuthenticated ?? false;
  }
  /**
   * @returns True if the user has at least one of the publicServantExpectedRoles
   * for the current organization
   */
  async isPublicServant(): Promise<boolean> {
    const context = await this.getContext();

    return context.isPublicServant;
  }
  async isCitizen(): Promise<boolean> {
    const context = await this.getContext();

    return !(context.isInactivePublicServant || context.isPublicServant);
  }
  /**
   * @returns True if the user has the inactivePublicServant role
   */
  async isInactivePublicServant(): Promise<boolean> {
    const context = await this.getContext();

    return context.isInactivePublicServant;
  }
  async hasPermissions(permissions: string[]): Promise<boolean> {
    const context = await this.getOriginalContext();

    const scopes = context.scopes ?? [];

    return hasPermissions(scopes, permissions);
  }
  /**
   * @returns The token got from the current context,
   * it does not perform any network request
   */
  async getTokenFromContext(): Promise<string | undefined> {
    const context = await this.getOriginalContext();

    return context.accessToken;
  }
  /**
   * Performs a network request to Logto for a token, serializing calls to prevent
   * concurrent refresh-token races.
   * @param resource Optional resource URL for access token; if omitted, requests an org token.
   * @returns A Promise that resolves to the requested token string.
   */
  async getToken(resource?: string): Promise<string> {
    return tokenMutex.runExclusive(async () => {
      const isCitizen = await this.isCitizen();
      if (!resource && isCitizen) {
        throw new Error("As a citizen a resource must be set");
      }

      const organizationId = this.getOrganizationId();
      if (resource && (isCitizen || !organizationId)) {
        return getAccessToken(this.config, resource);
      }

      if (organizationId) {
        return getOrganizationToken(this.config, organizationId);
      }

      throw new Error(
        "As a public servant one between resource and organization id must be set",
      );
    });
  }

  async isCitizenOnboarded() {
    if (!(await this.isCitizen())) {
      throw new Error("only citizens");
    }

    const context = await this.getOriginalContext(true);
    const isOnboarded = Boolean(
      context.userInfo?.roles?.some(
        (role) => role === ROLE_NAME_ONBOARDED_CITIZEN,
      ),
    );
    return isOnboarded;
  }

  async getSigninMethodRSC(): Promise<string | undefined> {
    try {
      const token = await getAccessTokenRSC(this.config, this.config.resources?.[0])
      const jwkEndpoint = new URL('/oidc/jwks', this.config.endpoint).toString();
      const oidcEndpoint = new URL('/oidc', this.config.endpoint).toString();
      const payload = await this.decodeToken(token, {
          jwkEndpoint,
          oidcEndpoint,
      })
      return payload?.signInMethod;
    } catch(error) {
      this.logger.error({ error }, "Cannot get the signin method");
    }
  }

  private async decodeToken(
    token: string,
    config: {
      jwkEndpoint: string;
      oidcEndpoint: string;
    }
  ): Promise<JWTPayload & { signInMethod?: string; }> {
    // Reference: https://docs.logto.io/docs/recipes/protect-your-api/node/
    const jwks = createRemoteJWKSet(new URL(config.jwkEndpoint));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.oidcEndpoint,
    });
    return payload;
  }

  private getOrganizationId(): string | undefined {
    try {
      if (!SelectedOrganizationHandler.isSet()) {
        return this.organizationId;
      }

      return SelectedOrganizationHandler.get();
    } catch {
      return this.organizationId;
    }
  }
}
