"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import type { AnalyticsConfigProps, AnalyticsTrackerProps } from ".";
import { BBClient } from ".";

export const useAnalyticsTracker =
  (config: AnalyticsConfigProps) =>
  ({ userId, customDimensions }: AnalyticsTrackerProps) => {
    const pathname = usePathname();
    const isInitialLoad = useRef(true);
    const isInitialized = useRef(false);

    const client = BBClient(config);

    const initAnalytics = useCallback(
      (userId?: string) => {
        client.analytics
          .initClientTracker({
            userId,
          })
          .then(() => {
            client.analytics.setTrackingContext({ customDimensions });
          })
          .catch(() => {
            // TODO: Handle error
          });
      },
      [client, customDimensions],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: Not needed
    useEffect(() => {
      if (isInitialized.current) {
        return;
      }
      isInitialized.current = true;

      initAnalytics(userId);
    }, [userId]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: Not needed
    useEffect(() => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      client.analytics.track
        .pageView({
          event: { title: pathname },
        })
        .catch(() => {
          // TODO: Handle error
        });
    }, [pathname]);
  };
