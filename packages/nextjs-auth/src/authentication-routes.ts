import type { LogtoNextConfig } from "@logto/next";
import { handleSignIn, signIn, signOut } from "@logto/next/server-actions";
import { addInactivePublicServantScope } from "./inactive-public-servant.js";
// import { SelectedOrganizationHandler } from "./selected-organization-handler.js";
import type { AuthSession } from "./types.js";

/**
 * This object wraps the logto routes managing the
 * inactive public servant configurations
 */
export const AuthenticationRoutes: AuthSession = {
  async login(config: LogtoNextConfig): Promise<void> {
    return signIn(addInactivePublicServantScope(config));
  },
  async logout(config: LogtoNextConfig, redirectUri: string): Promise<void> {
    //SelectedOrganizationHandler.delete();
    return signOut(addInactivePublicServantScope(config), redirectUri);
  },
  async loginCallback(
    config: LogtoNextConfig,
    searchParams: URLSearchParams,
  ): Promise<void> {
    return handleSignIn(addInactivePublicServantScope(config), searchParams);
  },
};
