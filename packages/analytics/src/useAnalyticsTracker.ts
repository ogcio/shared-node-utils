"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { AnalyticsConfigProps, AnalyticsTrackerProps } from ".";
import { BBClient } from ".";

export const useAnalyticsTracker =
  (config: AnalyticsConfigProps) =>
  ({ userId, customDimensions }: AnalyticsTrackerProps) => {
    const pathname = usePathname();
    const isInitialLoad = useRef(true);
    const isInitialized = useRef(false);

    const client = BBClient(config);

    function initAnalytics(userId?: string) {
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

      client.analytics.track
        .pageView({
          event: { title: pathname },
        })
        .catch(() => {
          // TODO: Handle error
        });
    }, [pathname]);
  };
