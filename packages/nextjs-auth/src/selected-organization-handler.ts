import { cookies } from "next/headers.js";
import type { SelectedOrganization } from "./types.js";
import { SELECTED_ORG_COOKIE } from "./utils/constants.js";

export const SelectedOrganizationHandler: SelectedOrganization = {
  set(
    organizationId: string,
    secure: boolean,
    overwrite = false,
    domain?: string,
  ): void {
    if (!overwrite && SelectedOrganizationHandler.isSet()) {
      return;
    }
    cookies().set(SELECTED_ORG_COOKIE, organizationId, { secure, domain });
  },
  get(): string | undefined {
    const value = cookies().get(SELECTED_ORG_COOKIE);
    if (!value) {
      return undefined;
    }

    return value.value;
  },
  delete(): void {
    cookies().delete(SELECTED_ORG_COOKIE);
  },
  isSet(): boolean {
    return cookies().has(SELECTED_ORG_COOKIE);
  },
};
