import type { LogtoNextConfig } from "@logto/next";
import { handleSignIn, signIn, signOut } from "@logto/next/server-actions";
import { LifeEventsAuthCookies } from "./auth-cookies.js";
import { addInactivePublicServantScope } from "./inactive-public-servant.js";
import { SelectedOrganizationHandler } from "./selected-organization-handler.js";
import type { AuthSession } from "./types.js";

export const AuthSessionHandler: AuthSession = {
  async login(config: LogtoNextConfig): Promise<void> {
    return signIn(addInactivePublicServantScope(config));
  },
  async logout(config: LogtoNextConfig, redirectUri: string): Promise<void> {
    SelectedOrganizationHandler.delete();
    LifeEventsAuthCookies.clear();
    return signOut(addInactivePublicServantScope(config), redirectUri);
  },
  async loginCallback(
    config: LogtoNextConfig,
    searchParams: URLSearchParams,
  ): Promise<void> {
    return handleSignIn(addInactivePublicServantScope(config), searchParams);
  },
};
