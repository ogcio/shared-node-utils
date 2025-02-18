import type { LogtoContext, LogtoNextConfig } from "@logto/next";
import {
  getAccessToken,
  getAccessTokenRSC,
  getLogtoContext,
  getOrganizationToken,
  getOrganizationTokenRSC,
} from "@logto/next/server-actions";
import { redirect } from "next/navigation.js";
import type { Logger } from "pino";
import { hasPermissions } from "./check-permissions.js";
import { addInactivePublicServantScope } from "./inactive-public-servant.js";
import { parseContext } from "./parse-logto-context.js";
import {
  type AuthSessionContext,
  type AuthSessionUserInfo,
  DEFAULT_LOGIN_PATH,
  type GetContextParams,
  type OrganizationData,
  type UserContext,
} from "./types.js";

export class UserContextHandler implements UserContext {
  readonly config: LogtoNextConfig;
  private organizationId?: string;
  private userInfo: AuthSessionUserInfo | undefined;
  constructor(
    config: LogtoNextConfig,
    private readonly getContextParameters: GetContextParams,
    private readonly logger: Logger,
  ) {
    this.config = addInactivePublicServantScope(config);
    this.organizationId =
      getContextParameters.additionalContextParams?.organizationId;
  }
  async getContext(): Promise<AuthSessionContext>;
  async getContext(addOriginalContext?: boolean): Promise<AuthSessionContext>;
  async getContext(addOriginalContext?: boolean): Promise<AuthSessionContext> {
    const includeOriginalContext = addOriginalContext ?? false;
    let context: LogtoContext | undefined;
    const loginUrl =
      this.getContextParameters?.additionalContextParams?.loginUrl ??
      DEFAULT_LOGIN_PATH;
    try {
      const fetchUserInfo = this.userInfo === undefined;
      context = await getLogtoContext(this.config, {
        ...this.getContextParameters?.logtoContextParams,
        fetchUserInfo,
      });
    } catch {
      redirect(loginUrl);
    }

    if (!context.isAuthenticated) {
      redirect(loginUrl);
    }

    try {
      return parseContext(
        context,
        {
          ...this.getContextParameters,
          additionalContextParams: {
            ...this.getContextParameters.additionalContextParams,
            includeOriginalContext,
          },
        },
        this.userInfo,
      );
    } catch (err) {
      this.logger.warn({ error: err }, "Cannot parse logto context");
      redirect(loginUrl);
    }
  }
  async getUser(): Promise<AuthSessionUserInfo | undefined> {
    if (this.userInfo) {
      return this.userInfo;
    }
    const context = await this.getContext(false);

    this.userInfo = context.user;

    return context.user;
  }
  async isAuthenticated(): Promise<boolean> {
    const context = await this.getContext(true);

    return context.originalContext?.isAuthenticated ?? false;
  }
  async isPublicServant(): Promise<boolean> {
    const context = await this.getContext();

    return context.isPublicServant;
  }
  async isCitizen(): Promise<boolean> {
    const context = await this.getContext();

    return !(context.isInactivePublicServant || context.isPublicServant);
  }
  async isInactivePublicServant(): Promise<boolean> {
    const context = await this.getContext();

    return context.isInactivePublicServant;
  }
  async hasPermissions(
    permissions: string[],
    matchMethod: "OR" | "AND" = "OR",
  ): Promise<boolean> {
    const context = await this.getContext(true);

    const scopes = context.originalContext?.scopes ?? [];

    return hasPermissions(scopes, permissions, { method: matchMethod });
  }
  async getTokenFromContext(): Promise<string | undefined> {
    const context = await this.getContext(true);

    return context.originalContext?.accessToken;
  }
  async getToken(resource?: string): Promise<string> {
    const isCitizen = await this.isCitizen();
    if (!resource && isCitizen) {
      throw new Error("As a citizen a resource must be set");
    }
    if (resource && (isCitizen || !this.organizationId)) {
      return getAccessToken(this.config, resource);
    }

    if (this.organizationId) {
      return getOrganizationToken(this.config, this.organizationId);
    }

    throw new Error(
      "As a public servant one between resource and organization id must be set",
    );
  }
  static async loadLoggedUser(
    config: LogtoNextConfig,
    getContextParameters: GetContextParams,
    redirectToLoginIfNotFound: boolean,
  ): Promise<string | undefined> {
    const loginUrl =
      getContextParameters?.additionalContextParams?.loginUrl ??
      DEFAULT_LOGIN_PATH;
    let userId: string | undefined = undefined;
    try {
      const loggedContext = await getLogtoContext(
        config,
        getContextParameters.logtoContextParams,
      );
      const parsed = parseContext(
        loggedContext,
        getContextParameters,
        undefined,
      );

      userId = parsed.user?.id;
    } catch {}

    if (!userId && redirectToLoginIfNotFound) {
      redirect(loginUrl);
    }

    return userId;
  }
  async getCurrentOrganization(): Promise<OrganizationData | undefined> {
    if (!this.organizationId) {
      return undefined;
    }
    const context = await this.getContext();

    if (!context.user?.organizationData) {
      return undefined;
    }

    return context.user?.organizationData[this.organizationId];
  }
}
