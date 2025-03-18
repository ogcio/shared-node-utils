import {
  type LogtoContext,
  type LogtoNextConfig,
  UserScope,
} from "@logto/next";
import type { getLogtoContext } from "@logto/next/server-actions";

export type AuthSessionUserInfo = {
  id: string;
  organizationData: Record<string, AuthSessionOrganizationInfo> | undefined;
  currentOrganization: AuthSessionOrganizationInfo | undefined;
};

export interface AuthSession {
  login(config: LogtoNextConfig): Promise<void>;
  logout(config: LogtoNextConfig, redirectUri: string): Promise<void>;
  loginCallback(
    config: LogtoNextConfig,
    searchParams: URLSearchParams,
  ): Promise<void>;
}

export type AuthSessionOrganizationInfo = {
  id: string;
  name: string;
  roles: string[];
  description: string | null;
};

export type AuthSessionContext = {
  isPublicServant: boolean;
  isInactivePublicServant: boolean;
  originalContext?: LogtoContext;
};

export interface UserContext {
  getUser(): Promise<AuthSessionUserInfo>;
  isAuthenticated(): Promise<boolean>;
  isPublicServant(): Promise<boolean>;
  isInactivePublicServant(): Promise<boolean>;
  isCitizen(): Promise<boolean>;
  hasPermissions(
    permissions: string[],
    matchMethod: "OR" | "AND",
  ): Promise<boolean>;
  getContext(): Promise<AuthSessionContext>;
  getTokenFromContext(): Promise<string | undefined>;
  getToken(resource?: string): Promise<string>;
}

export interface SelectedOrganization {
  set(
    organizationId: string,
    secure: boolean,
    overwrite?: boolean,
    domain?: string,
  ): void;
  get(): string | undefined;
  delete(): void;
  isSet(): boolean;
}

export type GetContextParams = {
  logtoContextParams?: Parameters<typeof getLogtoContext>[1];
  additionalContextParams?: {
    includeOriginalContext?: boolean;
    publicServantExpectedRoles?: string[];
    loginUrl?: string;
    organizationId?: string;
  };
};

/**
 * Logto claims needed to parse roles info
 * https://docs.logto.io/quick-starts/next-app-router
 * @returns list of default scopes
 */
export function getDefaultScopes(): UserScope[] {
  return [
    UserScope.Organizations,
    UserScope.OrganizationRoles,
    UserScope.Roles,
  ];
}
