import { getCommonLogger } from "@ogcio/nextjs-logging-wrapper/common-logger";
import createError from "http-errors";
import { notFound } from "next/navigation.js";
import type { Logger } from "pino";
import {
  type LogtoParams,
  getCitizenContext,
  getCitizenToken,
  getOrgToken,
  getPublicServantContext,
  getSelectedOrganization,
  isAuthenticated,
  isPublicServantAuthenticated,
  setSelectedOrganization,
} from "./authentication-context.js";
import type {
  AuthSessionContext,
  AuthSessionUserInfo,
  OrganizationData,
  PartialAuthSessionContext,
} from "./types.js";

export interface AuthenticationContextConfig {
  resourceUrl?: string;
  citizenScopes: string[];
  publicServantScopes: string[];
  organizationId?: string;
  loginUrl: string;
  publicServantExpectedRoles: string[];
  baseUrl: string;
  appId: string;
  appSecret: string;
}

export class BaseAuthenticationContext {
  readonly config: AuthenticationContextConfig;
  sharedContext: AuthSessionContext | null = null;
  citizenContext: PartialAuthSessionContext | null = null;
  publicServantContext: PartialAuthSessionContext | null = null;
  readonly logtoParams: LogtoParams;
  readonly logger: Logger;
  constructor(config: AuthenticationContextConfig, logtoParams: LogtoParams) {
    this.config = config;
    this.logtoParams = logtoParams;
    this.logger = getCommonLogger(this.logtoParams.logLevel);
  }

  async getContext() {
    if (!this.sharedContext) {
      this.logger.trace({}, "Shared context is not set");
      let context = await this.getCitizen();
      if (context.isPublicServant) {
        context = await this.getPublicServant();
      }

      this.sharedContext = this.ensureIsFullContext(context);
      this.logger.trace(
        {
          sharedContext: {
            ...this.sharedContext,
            organization: { id: this.sharedContext.organization?.id },
            user: { id: this.sharedContext.user.id },
          },
        },
        "Got shared context",
      );
    }

    return this.sharedContext;
  }

  async getCitizen() {
    if (!this.citizenContext) {
      this.citizenContext =
        this.sharedContext && !this.sharedContext.isPublicServant
          ? this.sharedContext
          : await getCitizenContext(
              { ...this.config, logtoParams: this.logtoParams },
              this.logger,
            );
    }
    return this.citizenContext as PartialAuthSessionContext;
  }

  async getPublicServant() {
    if (!this.publicServantContext) {
      this.publicServantContext = this.sharedContext?.isPublicServant
        ? this.publicServantContext
        : await getPublicServantContext(
            {
              ...this.config,
              organizationId: await this.getSelectedOrganization(),
              logtoParams: this.logtoParams,
            },
            this.logger,
          );
    }
    return this.publicServantContext as PartialAuthSessionContext;
  }

  private ensureIsFullContext(
    context: PartialAuthSessionContext,
  ): AuthSessionContext {
    if (!context.user) {
      this.logger.error({
        error: createError.Unauthorized("Missing user"),
      });
      throw notFound();
    }

    return context as AuthSessionContext;
  }

  async isPublicServant(): Promise<boolean> {
    return (await this.getPartialContext()).isPublicServant;
  }

  async isInactivePublicServant(): Promise<boolean> {
    return (await this.getPartialContext()).isInactivePublicServant;
  }

  async getUser(): Promise<AuthSessionUserInfo> {
    return (await this.getContext()).user;
  }

  async isPublicServantAuthenticated(): Promise<boolean> {
    return isPublicServantAuthenticated(
      { ...this.config, logtoParams: this.logtoParams },
      this.logger,
    );
  }

  async isCitizenAuthenticated(): Promise<boolean> {
    return isPublicServantAuthenticated(
      { ...this.config, logtoParams: this.logtoParams },
      this.logger,
    );
  }

  async isAuthenticated(): Promise<boolean> {
    return isAuthenticated({ ...this.config, logtoParams: this.logtoParams });
  }

  async getOrganizations(): Promise<Record<string, OrganizationData>> {
    return (await this.getCitizen()).user?.organizationData ?? {};
  }

  async getSelectedOrganization(): Promise<string> {
    const storedOrgId = getSelectedOrganization();

    if (storedOrgId) {
      const context = await this.getCitizen();
      const userOrganizations = Object.keys(
        context.user?.organizationData ?? {},
      );
      if (userOrganizations?.includes(storedOrgId)) {
        return storedOrgId;
      }
    }

    const orgs = await this.getOrganizations();
    const loadedOrganizationId = Object.values(orgs)?.[0]?.id;
    this.logger.trace({ loadedOrganizationId }, "Got organization id");

    return loadedOrganizationId;
  }

  setSelectedOrganization(organizationId: string): string {
    setSelectedOrganization(organizationId);
    return organizationId;
  }

  private getPartialContext = (): Promise<PartialAuthSessionContext> => {
    if (!this.citizenContext && !this.publicServantContext) {
      return this.getCitizen();
    }

    if (this.citizenContext) {
      return this.getCitizen();
    }

    return this.getPublicServant();
  };

  async getToken() {
    if (await this.isPublicServant()) {
      return getOrgToken(
        { ...this.config, logtoParams: this.logtoParams },
        await this.getSelectedOrganization(),
        this.logger,
      );
    }
    return getCitizenToken(
      { ...this.config, logtoParams: this.logtoParams },
      this.logger,
      this.config.resourceUrl,
    );
  }
}
