import { getBuildingBlockSDK, getM2MTokenFn } from "@ogcio/building-blocks-sdk";
import type { AnalyticsConfigProps } from ".";

export const BBClient = ({
  baseUrl,
  trackingWebsiteId,
  dryRun,
  organizationId,
  ...getOrganizationTokenParams
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
    getTokenFn: getM2MTokenFn({
      services: {
        analytics: {
          getOrganizationTokenParams: {
            organizationId,
            ...getOrganizationTokenParams,
          },
        },
      },
    }),
  });
