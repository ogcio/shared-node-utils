import { cookies } from "next/headers.js";
import type { SelectedOrganization } from "./types.js";

const SELECTED_ORG_COOKIE = "bb-selected-org-id";

export const SelectedOrganizationHandler: SelectedOrganization = {
  set(organizationId: string, secure: boolean, overwrite = false): void {
    if (!overwrite && SelectedOrganizationHandler.isSet()) {
      return;
    }
    cookies().set(SELECTED_ORG_COOKIE, organizationId, { secure });
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
