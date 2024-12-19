import { getBuildingBlockSDK, getM2MTokenFn } from "@ogcio/building-blocks-sdk";
import {
  type AnalyticsConfigProps,
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_SCOPES,
  SERVICE_NAME,
} from ".";

export const BBClient = ({
  baseUrl,
  trackingWebsiteId,
  dryRun,
  organizationId = DEFAULT_ORGANIZATION_ID,
  scopes = DEFAULT_SCOPES,
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
    getTokenFn: async (serviceName: string) => {
      if (serviceName === SERVICE_NAME) {
        return await getM2MTokenFn({
          services: {
            analytics: {
              getOrganizationTokenParams: {
                ...getOrganizationTokenParams,
                organizationId,
                scopes,
              },
            },
          },
        })(serviceName);
      }
      return "";
    },
  });
