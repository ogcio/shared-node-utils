import type { LogtoContext, LogtoNextConfig } from "@logto/next";
import {
  getAccessToken,
  getLogtoContext,
  getOrganizationToken,
} from "@logto/next/server-actions";
import { cookies } from "next/headers.js";
import { redirect } from "next/navigation.js";
import type { Logger } from "pino";
import { AuthCookieNames, LifeEventsAuthCookies } from "./auth-cookies.js";
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
    private readonly cookieSecure: boolean,
  ) {
    this.config = addInactivePublicServantScope(config);
    this.organizationId =
      getContextParameters.additionalContextParams?.organizationId;
    this.loginUrl =
      this.getContextParameters?.additionalContextParams?.loginUrl ??
      DEFAULT_LOGIN_PATH;
  }
  private async getOriginalContext(): Promise<LogtoContext> {
    let context: LogtoContext | undefined;
    try {
      const fetchUserInfo = !LifeEventsAuthCookies.has(
        AuthCookieNames.LifeEventsUserInfo,
      );
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
    const cookieContext = LifeEventsAuthCookies.get<AuthSessionContext>(
      AuthCookieNames.LifeEventsAuthContext,
    );
    if (cookieContext) {
      return {
        ...cookieContext,
        originalContext: includeOriginalContext ? context : undefined,
      };
    }
    let parsed: AuthSessionContext | undefined;
    try {
      parsed = parseContext(
        context,
        {
          ...this.getContextParameters,
          additionalContextParams: {
            ...this.getContextParameters.additionalContextParams,
            includeOriginalContext,
          },
        },
        LifeEventsAuthCookies.get<AuthSessionUserInfo>(
          AuthCookieNames.LifeEventsUserInfo,
        ),
      );
    } catch (err) {
      this.logger.warn({ error: err }, "Cannot parse logto context");
      redirect(this.loginUrl);
    }
    try {
      LifeEventsAuthCookies.set({
        name: AuthCookieNames.LifeEventsAuthContext,
        value: JSON.stringify(parsed),
        secure: this.cookieSecure,
      });
    } catch (e) {
      const errorMessage = e as Record<string, unknown>;
      if (
        !("message" in errorMessage) ||
        !(
          typeof errorMessage.message === "string" &&
          errorMessage.message.startsWith("Cookies can only be modified")
        )
      ) {
        throw e;
      }
    }
    return parsed;
  }
  async getUser(): Promise<AuthSessionUserInfo> {
    const cookieValue = LifeEventsAuthCookies.get<AuthSessionUserInfo>(
      AuthCookieNames.LifeEventsUserInfo,
    );
    if (cookieValue) {
      return cookieValue;
    }
    const context = await this.getOriginalContext();

    const parsed = parseUserInfo(context, this.getContextParameters);
    if (!parsed) {
      throw new Error("Can't extract user data");
    }
    try {
      LifeEventsAuthCookies.set({
        name: AuthCookieNames.LifeEventsUserInfo,
        value: JSON.stringify(parsed),
        secure: this.cookieSecure,
      });
    } catch (e) {
      const errorMessage = e as Record<string, unknown>;
      if (
        !("message" in errorMessage) ||
        !(
          typeof errorMessage.message === "string" &&
          errorMessage.message.startsWith("Cookies can only be modified")
        )
      ) {
        throw e;
      }
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
      const parsed = parseUserInfo(loggedContext, getContextParameters);

      userId = parsed?.id;
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

    return context.user.organizationData[this.organizationId];
  }
}
