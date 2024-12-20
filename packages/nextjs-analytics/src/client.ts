import { getBuildingBlockSDK, getM2MTokenFn } from "@ogcio/building-blocks-sdk";
import type {
  GetAccessTokenParams,
  GetOrganizationTokenParams,
} from "@ogcio/building-blocks-sdk/dist/types";
import { type AnalyticsConfigProps, DEFAULT_SCOPES } from ".";

const getM2MTokenForOrganization = (
  getOrganizationTokenParams: GetOrganizationTokenParams,
) =>
  getM2MTokenFn({
    services: {
      analytics: {
        getOrganizationTokenParams,
      },
    },
  });

const getM2MTokenForCitizen = (getAccessTokenParams: GetAccessTokenParams) =>
  getM2MTokenFn({
    services: {
      analytics: {
        getAccessTokenParams,
      },
    },
  });

export const BBClient = ({
  baseUrl,
  trackingWebsiteId,
  dryRun,
  organizationId,
  scopes = DEFAULT_SCOPES,
  ...getTokenParams
}: AnalyticsConfigProps) =>
  getBuildingBlockSDK({
    services: {
      analytics: {
        baseUrl,
        trackingWebsiteId,
        organizationId,
        dryRun,
      },
    },
    getTokenFn: organizationId
      ? getM2MTokenForOrganization({
          organizationId,
          ...(getTokenParams as Omit<
            GetOrganizationTokenParams,
            "organizationId"
          >),
        })
      : getM2MTokenForCitizen({
          scopes,
          ...(getTokenParams as GetAccessTokenParams),
        }),
  });
