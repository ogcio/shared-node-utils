import { getBuildingBlockSDK, getM2MTokenFn } from "@ogcio/building-blocks-sdk";
import { type AnalyticsConfigProps, DEFAULT_SCOPES, SERVICE_NAME } from ".";

export const BBClient = ({
  baseUrl,
  trackingWebsiteId,
  organizationId,
  dryRun,
  applicationId,
  applicationSecret,
  logtoOidcEndpoint,
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
                applicationId,
                applicationSecret,
                logtoOidcEndpoint,
                organizationId,
                scopes: DEFAULT_SCOPES,
              },
            },
          },
        })(serviceName);
      }
      return "";
    },
  });
