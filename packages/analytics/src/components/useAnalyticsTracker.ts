"use client";

import { getBuildingBlockSDK, getM2MTokenFn } from "@ogcio/building-blocks-sdk";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

interface AnalyticsConfigProps {
  baseUrl: string;
  trackingWebsiteId: string;
  organizationId: string;
  dryRun: boolean;
  applicationId: string;
  applicationSecret: string;
  logtoOidcEndpoint: string;
}

interface AnalyticsTrackerProps {
  /**
   * The user ID to track.
   * Ensure that the user ID is unique to the user.
   * Tracking the UserID should be done in compliance with the GDPR.
   * @default undefined
   */
  userId?: string;
  customDimensions?: {
    [x: `dimension${number}`]: string;
  };
}

export const useAnalyticsTracker =
  ({
    baseUrl,
    trackingWebsiteId,
    organizationId,
    dryRun,
    applicationId,
    applicationSecret,
    logtoOidcEndpoint,
  }: AnalyticsConfigProps) =>
  ({ userId, customDimensions }: AnalyticsTrackerProps) => {
    const pathname = usePathname();
    const isInitialLoad = useRef(true);
    const isInitialized = useRef(false);

    const client = getBuildingBlockSDK({
      services: {
        analytics: {
          baseUrl,
          trackingWebsiteId,
          organizationId,
          dryRun,
        },
      },
      getTokenFn: async (serviceName: string) => {
        if (serviceName === "analytics") {
          return await getM2MTokenFn({
            services: {
              analytics: {
                getOrganizationTokenParams: {
                  applicationId,
                  applicationSecret,
                  logtoOidcEndpoint,
                  organizationId,
                  scopes: ["analytics:website:tracking"],
                },
              },
            },
          })(serviceName);
        }
        return "";
      },
    });

    function initAnalytics(userId?: string) {
      client.analytics
        .initClientTracker({
          userId,
        })
        .then(() => {
          client.analytics.setTrackingContext({
            customDimensions: customDimensions,
          });
        })
        .catch(() => {
          // TODO: Handle error
        });
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
      if (isInitialized.current) {
        return;
      }
      isInitialized.current = true;

      initAnalytics(userId);
    }, [userId]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      client.analytics.track.pageView({
        event: { title: pathname },
      });
    }, [pathname]);
  };
