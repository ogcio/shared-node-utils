import type { LogtoContext, LogtoNextConfig } from "@logto/next";
import type { getLogtoContext } from "@logto/next/server-actions";

export const DEFAULT_ORGANIZATION_ID = "ogcio";

export type OrganizationData = {
  id: string;
  name: string;
  description: string | null;
};
export type AuthSessionUserInfo = {
  name: string | null;
  username: string | null;
  id: string;
  email: string | null;
  organizationData?: Record<string, OrganizationData>;
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
};

export type AuthSessionContext = {
  user?: AuthSessionUserInfo;
  isPublicServant: boolean;
  isInactivePublicServant: boolean;
  organization?: AuthSessionOrganizationInfo;
  originalContext?: LogtoContext;
};

export interface UserContext {
  getUser(): Promise<AuthSessionUserInfo | undefined>;
  isAuthenticated(): Promise<boolean>;
  isPublicServant(): Promise<boolean>;
  isInactivePublicServant(): Promise<boolean>;
  isCitizen(): Promise<boolean>;
  hasPermissions(
    permissions: string[],
    matchMethod: "OR" | "AND",
  ): Promise<boolean>;
  getContext(): Promise<AuthSessionContext>;
  getToken(): Promise<string | undefined>;
}

export interface SelectedOrganization {
  set(organizationId: string, overwrite?: boolean): void;
  get(): string | undefined;
  unset(): void;
  isSet(): boolean;
}

export const DEFAULT_LOGIN_PATH = "/login";

export type GetContextParams = {
  logtoContextParams?: Parameters<typeof getLogtoContext>[1];
  additionalContextParams?: {
    includeOriginalContext?: boolean;
    publicServantExpectedRoles?: string[];
    loginUrl?: string;
    organizationId?: string;
  };
};
