import type { LogtoContext, LogtoNextConfig } from "@logto/next";
import { getLogtoContext } from "@logto/next/server-actions";
import { redirect } from "next/navigation.js";
import type { Logger } from "pino";
import { hasPermissions } from "./check-permissions.js";
import { addInactivePublicServantScope } from "./inactive-public-servant.js";
import { parseContext } from "./parse-logto-context.js";
import { SelectedOrganizationHandler } from "./selected-organization-handler.js";
import {
  type AuthSessionContext,
  type AuthSessionUserInfo,
  DEFAULT_LOGIN_PATH,
  type GetContextParams,
  type UserContext,
} from "./types.js";

export class UserContextHandler implements UserContext {
  readonly config: LogtoNextConfig;
  readonly organizationId?: string;
  constructor(
    config: LogtoNextConfig,
    private readonly getContextParameters: GetContextParams,
    private readonly logger: Logger,
  ) {
    this.config = addInactivePublicServantScope(config);
    this.organizationId =
      this.getContextParameters.additionalContextParams?.organizationId ??
      this.getContextParameters.logtoContextParams?.organizationId;
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
      context = await getLogtoContext(
        this.config,
        this.getContextParameters?.logtoContextParams,
      );
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
        this.organizationId,
      );
    } catch (err) {
      this.logger.warn({ error: err }, "Cannot parse logto context");
      redirect(loginUrl);
    }
  }
  async getUser(): Promise<AuthSessionUserInfo | undefined> {
    const context = await this.getContext();

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
  async getToken(): Promise<string | undefined> {
    const context = await this.getContext(true);

    return context.originalContext?.accessToken;
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
      const organizationId =
        getContextParameters.additionalContextParams?.organizationId ??
        getContextParameters.logtoContextParams?.organizationId;
      const parsed = parseContext(
        loggedContext,
        getContextParameters,
        organizationId,
      );

      userId = parsed.user?.id;
    } catch {}

    if (!userId && redirectToLoginIfNotFound) {
      redirect(loginUrl);
    }

    return userId;
  }
}
