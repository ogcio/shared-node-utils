import type { LogtoContext, LogtoNextConfig } from "@logto/next";
import {
  getAccessToken,
  getLogtoContext,
  getOrganizationToken,
} from "@logto/next/server-actions";
import { redirect } from "next/navigation.js";
import type { Logger } from "pino";
import { hasPermissions } from "./check-permissions.js";
import { addInactivePublicServantScope } from "./inactive-public-servant.js";
import { parseContext, parseUserInfo } from "./parse-logto-context.js";
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
  async getUser(): Promise<AuthSessionUserInfo> {
    const context = await this.getOriginalContext(true);

    const parsed = parseUserInfo(context, this.getContextParameters);
    if (!parsed) {
      throw new Error("Can't extract user data");
    }
    return parsed;
  }
  async isAuthenticated(): Promise<boolean> {
    const context = await this.getOriginalContext();

    return context.isAuthenticated ?? false;
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
    const context = await this.getOriginalContext();

    const scopes = context.scopes ?? [];

    return hasPermissions(scopes, permissions, { method: matchMethod });
  }
  async getTokenFromContext(): Promise<string | undefined> {
    const context = await this.getOriginalContext();

    return context.accessToken;
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
  /**
   * Use this method carefully
   * cause it runs a network request against Logto
   * @returns The current organization info from Logto
   */
  async getCurrentOrganization(): Promise<OrganizationData | undefined> {
    if (!this.organizationId) {
      return undefined;
    }
    const user = await this.getUser();

    if (!user?.organizationData) {
      return undefined;
    }

    return user.organizationData[this.organizationId];
  }
}
